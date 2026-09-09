import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { RequestWithUser } from '../types';
import { Payroll, User, PayrollPeriodLock, Company, CompanyGstNumber, PayslipDelivery } from '../models';
import { Op, Sequelize } from 'sequelize';
import sequelize from '../config/database';
import fs from 'fs';
import path from 'path';
import { ensureUploadSubdir, resolveStoredUploadPath, bufferLooksLikePdf } from '../utils/uploadPath';
import { buildNodemailerTransportOptions, getResolvedMailTransportOptions } from '../utils/mailConfig';
import {
  parsePayrollPeriod,
  normalizePayrollPeriodInput,
  sameMonthPayrollPeriodWhere,
  isPayrollPeriodAfterCurrentMonth,
  findEffectiveEmploymentContract,
  computeBonusFromContract,
  aggregateAttendanceForPeriod,
  computeOvertimePay
} from '../services/payrollBulkGeneration';
import {
  computeIndianStatutoryPayroll,
  breakdownToExtraFields,
  computeProratedSumTotal,
  computeDailyWorkerSumTotal,
  normalizePfCalcMode,
  type PfCalcMode
} from '../services/indianStatutoryPayroll';
import { resolveCompanyRegisteredStateCode } from '../utils/indianProfessionalTax';

async function persistPayslipDelivery(params: {
  tenant_id: number;
  company_id: number;
  senderId: number;
  to: string;
  period: string;
  employeeName: string;
  empId: string;
  netSalary: number | null;
  userId: number | null;
  pdfBuffer: Buffer;
}): Promise<{ pdf_url: string }> {
  const {
    tenant_id,
    company_id,
    senderId,
    to,
    period,
    employeeName,
    empId,
    netSalary,
    userId,
    pdfBuffer
  } = params;

  if (!bufferLooksLikePdf(pdfBuffer)) {
    throw new Error('INVALID_PDF');
  }

  const emailLower = to.toLowerCase();
  let matchedUserId = userId;
  let matchedEmpId = empId;

  if (!matchedUserId) {
    const byEmail = await (User as any).findOne({
      where: {
        tenant_id,
        company_id,
        status: 'active',
        [Op.and]: [Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('email')), emailLower)]
      },
      attributes: ['id', 'employee_number']
    });
    if (byEmail) {
      matchedUserId = byEmail.id;
      if (!matchedEmpId) matchedEmpId = String(byEmail.employee_number || '').trim();
    }
  }
  if (!matchedUserId && matchedEmpId) {
    const byEmp = await (User as any).findOne({
      where: {
        tenant_id,
        company_id,
        status: 'active',
        employee_number: matchedEmpId
      },
      attributes: ['id', 'employee_number']
    });
    if (byEmp) matchedUserId = byEmp.id;
  }

  const dir = ensureUploadSubdir('payslips', String(tenant_id), String(company_id));
  const fileName = `payslip-${period || 'na'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
  const absPath = path.join(dir, fileName);
  await fs.promises.writeFile(absPath, pdfBuffer);
  const pdfUrl = `/uploads/payslips/${tenant_id}/${company_id}/${fileName}`;

  const previousRows = await (PayslipDelivery as any).findAll({
    where: {
      tenant_id,
      company_id,
      payroll_period: period || '',
      is_active: true,
      [Op.and]: [Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('recipient_email')), emailLower)]
    }
  });
  for (const prev of previousRows) {
    await prev.update({ is_active: false });
  }

  await (PayslipDelivery as any).create({
    tenant_id,
    company_id,
    user_id: matchedUserId ?? null,
    payroll_period: period || '',
    employee_name: employeeName || null,
    recipient_email: to,
    emp_id: matchedEmpId || null,
    net_salary: Number.isFinite(netSalary as number) ? netSalary : null,
    pdf_path: absPath,
    pdf_url: pdfUrl,
    sent_by: senderId,
    sent_at: new Date(),
    is_active: true
  });

  return { pdf_url: pdfUrl };
}
const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

/** 「급여 명세서 발송」페이지 기본 메일과 동일 (영문 전용) */
const DEFAULT_PAYSLIP_MAIL_SUBJECT = '[{{company}}] {{month}} Payslip Attached ({{name}})';
const DEFAULT_PAYSLIP_MAIL_BODY =
  'Dear {{name}},\n\nI hope you are doing well.\n\nPlease find attached your payslip for {{month}} {{year}} for your reference.\nKindly review it at your convenience, and please feel free to contact us if you have any questions or require further clarification.\nThank you for your continued dedication and contribution to the company.\nBest regards,\n{{company}}';

function shortCompanyNameForMail(name?: string | null): string {
  return String(name || '')
    .replace(/\bprivate\s+limited\b\.?/gi, '')
    .replace(/\bpvt\.?\s*ltd\.?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,\s]+$/g, '')
    .trim();
}

function fillPayslipMailTemplate(
  template: string,
  vars: { name: string; company: string; period: string }
): string {
  const period = String(vars.period || '').trim();
  const ym = period.match(/^(20\d{2})-(\d{1,2})$/);
  const year = ym ? ym[1] : period.match(/^(20\d{2})/)?.[1] || '';
  const monthLabel = ym
    ? MONTH_NAMES_EN[Math.max(0, Number(ym[2]) - 1)] || period
    : period;
  return template
    .replace(/\{\{name\}\}/g, vars.name || '')
    .replace(/\{\{month\}\}/g, monthLabel)
    .replace(/\{\{year\}\}/g, year)
    .replace(/\{\{company\}\}/g, vars.company || '');
}

const PAYROLL_MUTABLE_FIELDS = [
  'employee_id',
  'payroll_period',
  'basic_salary',
  'overtime_pay',
  'bonus',
  'allowances',
  'deductions',
  'gross_salary',
  'net_salary',
  'tax_amount',
  'status',
  'payment_date',
  'extra_fields'
] as const;

function pickPayrollBody(body: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of PAYROLL_MUTABLE_FIELDS) {
    if (body[k] !== undefined) o[k] = body[k];
  }
  return o;
}

async function isPayrollPeriodLocked(
  tenantId: number,
  companyId: number,
  payrollPeriod: string
): Promise<boolean> {
  const norm = normalizePayrollPeriodInput(payrollPeriod);
  if (!norm) return false;
  const row = await (PayrollPeriodLock as any).findOne({
    where: {
      tenant_id: tenantId,
      company_id: companyId,
      [Op.or]: [
        { payroll_period: norm },
        { payroll_period: { [Op.like]: `${norm}-%` } }
      ]
    }
  });
  return !!row;
}

async function assertPayrollPeriodEditable(
  req: RequestWithUser,
  tenantId: number,
  companyId: number,
  payrollPeriod: string,
  res: Response
): Promise<boolean> {
  if (req.user?.role === 'root') return true;
  const locked = await isPayrollPeriodLocked(tenantId, companyId, payrollPeriod);
  if (locked) {
    res.status(403).json({
      success: false,
      message: '해당 급여 월은 확정되어 수정할 수 없습니다.'
    });
    return false;
  }
  return true;
}

// 급여 목록 조회
export const getPayrolls = async (req: RequestWithUser, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const { page = 1, limit = 10, employee_id = '', period = '', company_id } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 급여 조회 가능, 아니면 자신의 회사 급여만
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    } else {
      // root는 company_id 쿼리 파라미터로 회사별 필터링 가능
      if (userRole === 'root' && company_id) {
        whereClause.company_id = parseInt(company_id as string);
      } else if (userRole === 'root') {
        // root가 company_id를 지정하지 않으면 모든 회사 조회
      } else {
        // audit는 모든 회사 조회 가능
        if (tenantId) whereClause.tenant_id = tenantId;
        if (companyId) whereClause.company_id = companyId;
      }
    }
    
    if (employee_id) {
      whereClause.employee_id = employee_id;
    }
    
    if (period) {
      whereClause.payroll_period = period;
    }

    // 활성화된 급여만 조회
    whereClause.is_active = true;

    const payrolls = await (Payroll as any).findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: [
            'id',
            'username',
            'email',
            'department',
            'position',
            'employee_number',
            'birth_date',
            'hire_date',
            'ot_eligible',
            'pf_calc_mode',
            'bank_name',
            'bank_account',
            'bank_ifsc'
          ]
        }
      ],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['payroll_period', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: payrolls.rows,
      pagination: {
        total: payrolls.count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(payrolls.count / Number(limit))
      }
    });
  } catch (error) {
    console.error('급여 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 상세 조회
export const getPayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;

    const whereClause: any = { id };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    // 활성화된 급여만 조회
    whereClause.is_active = true;

    const payroll = await (Payroll as any).findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: [
            'id',
            'username',
            'email',
            'department',
            'position',
            'employee_number',
            'birth_date',
            'hire_date',
            'ot_eligible',
            'pf_calc_mode'
          ]
        }
      ]
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 생성
export const createPayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const picked = pickPayrollBody(req.body as Record<string, unknown>);
    const period = String((picked as any).payroll_period ?? '').trim();
    if (!period) {
      return res.status(400).json({ success: false, message: '급여 기간(payroll_period)이 필요합니다.' });
    }
    const periodNorm = normalizePayrollPeriodInput(period);
    if (periodNorm && isPayrollPeriodAfterCurrentMonth(periodNorm)) {
      return res.status(400).json({
        success: false,
        message: '아직 도래하지 않은 급여 월은 생성할 수 없습니다.'
      });
    }
    if (!(await assertPayrollPeriodEditable(req, tenant_id, company_id, period, res))) return;

    const payrollData = { ...picked, tenant_id, company_id, created_by: user_id, is_active: true };

    const payroll = await (Payroll as any).create(payrollData);

    res.status(201).json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

/** 현재 로그인 회사의 활성 사용자 기준으로 급여 행 일괄 생성.
 *  확정(잠금)된 월은 root 포함 일괄 생성 불가.
 *  미확정 월에 활성 급여가 있으면 soft-delete(is_active=false) 후 재생성.
 *  전자근로계약(해당 월 유효·서명/활성)의 기본급·상여 유형을 우선 반영하고, 근태(해당 월)로 근무일·연장시간을 채웁니다. */
export const bulkGeneratePayrolls = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const payroll_period = normalizePayrollPeriodInput(String(req.body?.payroll_period || '').trim());
    if (!payroll_period) {
      return res.status(400).json({
        success: false,
        message: '급여 기간(payroll_period)이 필요하며 YYYY-MM 형식이어야 합니다.'
      });
    }

    const bounds = parsePayrollPeriod(payroll_period);
    if (!bounds) {
      return res.status(400).json({
        success: false,
        message: '급여 기간은 YYYY-MM 형식이어야 합니다.'
      });
    }

    if (isPayrollPeriodAfterCurrentMonth(payroll_period)) {
      return res.status(400).json({
        success: false,
        message: '아직 도래하지 않은 급여 월은 생성할 수 없습니다.'
      });
    }

    if (await isPayrollPeriodLocked(tenant_id, company_id, payroll_period)) {
      return res.status(403).json({
        success: false,
        message: '해당 급여 월은 확정되어 일괄 생성할 수 없습니다.'
      });
    }

    // 미확정 월 재생성: 기존 활성 급여는 soft-delete 후 새로 생성
    const { created, deactivatedCount } = await sequelize.transaction(async (transaction) => {
      const [deactivated] = await (Payroll as any).update(
        { is_active: false },
        {
          where: {
            tenant_id,
            company_id,
            is_active: true,
            ...sameMonthPayrollPeriodWhere(payroll_period)
          },
          transaction
        }
      );

      const employees = await (User as any).findAll({
        where: { tenant_id, company_id, status: 'active' },
        attributes: [
          'id',
          'username',
          'department',
          'position',
          'birth_date',
          'hire_date',
          'salary',
          'bank_name',
          'bank_account',
          'bank_ifsc',
          'employment_type',
          'ot_eligible',
          'pf_calc_mode',
          'employee_number'
        ],
        transaction
      });

      let createdCount = 0;
      const registeredStateCode = await resolveCompanyRegisteredStateCode(company_id, {
        Company,
        CompanyGstNumber
      });

      for (const emp of employees) {
        const contract = await findEffectiveEmploymentContract(tenant_id, company_id, emp.id, bounds);
        const profileSalary = parseFloat(String(emp.salary ?? 0)) || 0;
        const contractSalary =
          contract && contract.salary != null ? parseFloat(String(contract.salary)) || 0 : 0;
        const useContractSalary = contract && contractSalary > 0;
        const basic_salary = useContractSalary ? contractSalary : profileSalary;

        const isDaily = String((emp as any).employment_type || '').toLowerCase() === 'daily';

        /** 일용직: 급여 필드는 일당. 상여·연장 산정용 월 환산 = 일당 × 해당월 일수 */
        const monthlyEquivForDaily = basic_salary * bounds.daysInMonth;

        const att = await aggregateAttendanceForPeriod(tenant_id, company_id, emp.id, bounds);
        const rawOtEligible = (emp as any).ot_eligible ?? (emp as any).get?.('ot_eligible');
        const otEligible =
          rawOtEligible === true ||
          rawOtEligible === 1 ||
          rawOtEligible === '1' ||
          rawOtEligible === 'true';
        const dayOtHours = otEligible ? att.dayOtHours : 0;
        const nightOtHours = otEligible ? att.nightOtHours : 0;
        const overtimeHoursForPay = otEligible ? att.overtimeHours : 0;

        const bonus =
          isDaily && att.recordCount === 0
            ? 0
            : computeBonusFromContract(
                isDaily ? monthlyEquivForDaily : basic_salary,
                contract && typeof (contract as any).toJSON === 'function'
                  ? (contract as any).toJSON()
                  : contract
              );
        const overtime_pay = computeOvertimePay(
          isDaily ? monthlyEquivForDaily : basic_salary,
          overtimeHoursForPay
        );

        const pr = isDaily
          ? computeDailyWorkerSumTotal(
              basic_salary,
              overtime_pay,
              bonus,
              bounds.daysInMonth,
              att.daysWorked,
              att.recordCount
            )
          : computeProratedSumTotal(
              basic_salary,
              overtime_pay,
              bonus,
              bounds.daysInMonth,
              att.daysWorked,
              att.recordCount
            );
        const gross_salary = pr.sumTotal;

        const bodyOpts = (req.body || {}) as Record<string, unknown>;
        const statutoryApplicable = bodyOpts.statutory_india !== false;
        const estimateTds = bodyOpts.estimate_tds !== false;
        const pfCalcMode: PfCalcMode = normalizePfCalcMode(
          (emp as any).pf_calc_mode ?? bodyOpts.pf_calc_mode ?? bodyOpts.pf_mode
        );

        const stat = computeIndianStatutoryPayroll(gross_salary, {
          statutoryApplicable,
          pfCalcMode,
          pfMode: pfCalcMode,
          estimateTds,
          basicSalary: isDaily ? monthlyEquivForDaily : basic_salary,
          totalSalary: isDaily ? monthlyEquivForDaily : basic_salary,
          registeredStateCode,
          payrollMonth: payroll_period
        });
        const statExtra = breakdownToExtraFields(stat);

        const birth = emp.birth_date ? String(emp.birth_date).split('T')[0] : '';
        const hire = emp.hire_date ? String(emp.hire_date).split('T')[0] : '';
        const empNumber = emp.employee_number != null ? String(emp.employee_number).trim() : '';

        const bankAccount = emp.bank_account != null ? String(emp.bank_account).trim() : '';
        const bankIfsc = emp.bank_ifsc != null ? String(emp.bank_ifsc).trim() : '';
        const bankName = emp.bank_name != null ? String(emp.bank_name).trim() : '';

        const extra_fields = {
          emp_id: empNumber,
          bank_account: bankAccount,
          ifsc: bankIfsc,
          bank_name: bankName,
          department: emp.department || '',
          employee_name: emp.username || '',
          position: emp.position || '',
          birth_date: birth,
          joining_date: hire,
          working_month: payroll_period,
          total_day_of_month: String(bounds.daysInMonth),
          unpaid_leave: String(
            isDaily && att.recordCount === 0 ? bounds.daysInMonth : att.absentDays
          ),
          days_worked: String(pr.effectiveDaysWorked),
          prorated_basic: String(pr.proratedBasic),
          ...statExtra,
          account_cash: '',
          salary_source: isDaily
            ? 'daily_wage'
            : useContractSalary
              ? 'employment_contract'
              : 'user_profile',
          employment_type: String((emp as any).employment_type || ''),
          employment_contract_id: contract ? contract.id : null,
          working_days_contract: contract?.working_days ?? '',
          attendance_records: String(att.recordCount),
          attendance_overtime_hours: String(overtimeHoursForPay),
          attendance_day_ot_hours: String(dayOtHours),
          attendance_night_ot_hours: String(nightOtHours),
          attendance_holiday_work_hours: String(att.holidayWorkHours),
          day_ot_hour: String(dayOtHours),
          night_ot_hour: String(nightOtHours),
          ot_eligible: String(otEligible),
          pf_calc_mode: statutoryApplicable ? pfCalcMode : '',
          indian_pf_mode: statutoryApplicable ? pfCalcMode : '',
          indian_statutory_version: 'pf_calc_mode_v1'
        };

        await (Payroll as any).create(
          {
            tenant_id,
            company_id,
            employee_id: emp.id,
            payroll_period,
            basic_salary,
            overtime_pay,
            bonus,
            allowances: 0,
            deductions: 0,
            gross_salary,
            net_salary: stat.net_payable,
            tax_amount: stat.tds,
            status: 'pending',
            created_by: user_id,
            is_active: true,
            extra_fields
          },
          { transaction }
        );
        createdCount += 1;
      }

      return { created: createdCount, deactivatedCount: Number(deactivated) || 0 };
    });

    res.status(201).json({
      success: true,
      message:
        deactivatedCount > 0
          ? `기존 ${deactivatedCount}건을 비활성화한 뒤 급여 ${created}건을 다시 생성했습니다. 전자근로계약·근태를 반영했습니다.`
          : `급여 ${created}건이 생성되었습니다. 전자근로계약·근태를 반영했습니다.`,
      data: { created, replaced: deactivatedCount }
    });
  } catch (error) {
    console.error('급여 일괄 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

/** 일괄 생성 전: 확정·중복 여부와 직원별 해당 월 출퇴근 건수 요약 */
export const previewBulkPayrollGeneration = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const payroll_period = normalizePayrollPeriodInput(String(req.body?.payroll_period || '').trim());
    if (!payroll_period) {
      return res.status(400).json({
        success: false,
        message: '급여 기간(payroll_period)이 필요하며 YYYY-MM 형식이어야 합니다.'
      });
    }
    const bounds = parsePayrollPeriod(payroll_period);
    if (!bounds) {
      return res.status(400).json({
        success: false,
        message: '급여 기간은 YYYY-MM 형식이어야 합니다.'
      });
    }

    if (isPayrollPeriodAfterCurrentMonth(payroll_period)) {
      return res.status(400).json({
        success: false,
        message: '아직 도래하지 않은 급여 월은 생성할 수 없습니다.'
      });
    }

    if (await isPayrollPeriodLocked(tenant_id, company_id, payroll_period)) {
      return res.status(403).json({
        success: false,
        message: '해당 급여 월은 확정되어 일괄 생성할 수 없습니다.'
      });
    }

    const existingActive = await (Payroll as any).count({
      where: {
        tenant_id,
        company_id,
        is_active: true,
        ...sameMonthPayrollPeriodWhere(payroll_period)
      }
    });

    const employees = await (User as any).findAll({
      where: { tenant_id, company_id, status: 'active' },
      attributes: ['id', 'username', 'employment_type']
    });

    let with_attendance = 0;
    let without_attendance = 0;
    const without_attendance_usernames: string[] = [];
    const daily_without_records: { id: number; username: string }[] = [];

    for (const emp of employees) {
      const att = await aggregateAttendanceForPeriod(tenant_id, company_id, emp.id, bounds);
      const name = String((emp as any).username || '').trim() || `user#${(emp as any).id}`;
      const isDaily = String((emp as any).employment_type || '').toLowerCase() === 'daily';
      if (att.recordCount > 0) {
        with_attendance += 1;
      } else {
        without_attendance += 1;
        if (without_attendance_usernames.length < 25) {
          without_attendance_usernames.push(name);
        }
        if (isDaily && daily_without_records.length < 80) {
          daily_without_records.push({ id: (emp as any).id, username: name });
        }
      }
    }

    res.json({
      success: true,
      data: {
        payroll_period,
        can_generate: true,
        block_reason: null,
        will_replace: existingActive > 0,
        existing_active_count: existingActive,
        employee_total: employees.length,
        attendance: {
          with_attendance,
          without_attendance,
          without_attendance_usernames,
          daily_without_records
        }
      }
    });
  } catch (error) {
    console.error('급여 일괄 생성 미리보기 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 수정
export const updatePayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const payroll = await (Payroll as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    const picked = pickPayrollBody(req.body as Record<string, unknown>);
    if (
      picked.extra_fields &&
      typeof picked.extra_fields === 'object' &&
      !Array.isArray(picked.extra_fields)
    ) {
      picked.extra_fields = picked.extra_fields as Record<string, unknown>;
    }

    const oldPeriod = String(payroll.payroll_period);
    const newPeriod =
      picked.payroll_period !== undefined ? String(picked.payroll_period).trim() : oldPeriod;
    if (!(await assertPayrollPeriodEditable(req, tenant_id, company_id, oldPeriod, res))) return;
    if (
      newPeriod !== oldPeriod &&
      !(await assertPayrollPeriodEditable(req, tenant_id, company_id, newPeriod, res))
    ) {
      return;
    }

    await payroll.update(picked);

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 삭제
export const deletePayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const payroll = await (Payroll as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    if (!(await assertPayrollPeriodEditable(req, tenant_id, company_id, String(payroll.payroll_period), res)))
      return;

    // 소프트 삭제: is_active를 false로 설정
    await payroll.update({ is_active: false });

    res.json({ success: true, message: '급여 정보가 비활성화되었습니다.' });
  } catch (error) {
    console.error('급여 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 승인
export const approvePayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const payroll = await (Payroll as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    if (!(await assertPayrollPeriodEditable(req, tenant_id, company_id, String(payroll.payroll_period), res)))
      return;

    await payroll.update({ status: 'approved' });

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 승인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 지급
export const payPayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const payroll = await (Payroll as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    if (!(await assertPayrollPeriodEditable(req, tenant_id, company_id, String(payroll.payroll_period), res)))
      return;

    await payroll.update({ 
      status: 'paid',
      payment_date: new Date().toISOString().split('T')[0]
    });

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 지급 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

/** 회사별 확정(잠금)된 급여 근무월 목록 */
export const getPayrollPeriodLocks = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const rows = await (PayrollPeriodLock as any).findAll({
      where: { tenant_id, company_id },
      attributes: ['payroll_period', 'locked_at'],
      order: [['payroll_period', 'DESC']]
    });
    res.json({
      success: true,
      data: { locked_periods: rows.map((r: { payroll_period: string }) => r.payroll_period) }
    });
  } catch (error) {
    console.error('급여 월 잠금 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

/** 선택한 근무월 급여 확정 — 일반 사용자는 이후 해당 월 데이터 수정 불가 (root 제외) */
export const completePayrollPeriod = async (req: RequestWithUser, res: Response) => {
  try {
    const payroll_period = normalizePayrollPeriodInput(String(req.body?.payroll_period || '').trim());
    if (!payroll_period || !parsePayrollPeriod(payroll_period)) {
      return res.status(400).json({
        success: false,
        message: '급여 기간은 YYYY-MM 형식이어야 합니다.'
      });
    }
    if (isPayrollPeriodAfterCurrentMonth(payroll_period)) {
      return res.status(400).json({
        success: false,
        message: '아직 도래하지 않은 급여 월은 확정할 수 없습니다.'
      });
    }
    const { tenant_id, company_id, id: user_id } = req.user;
    const [row, created] = await (PayrollPeriodLock as any).findOrCreate({
      where: { tenant_id, company_id, payroll_period },
      defaults: { locked_at: new Date(), locked_by: user_id }
    });
    res.json({
      success: true,
      message: created
        ? '해당 급여 월이 확정되었습니다. 일반 사용자는 더 이상 수정할 수 없습니다.'
        : '이미 확정된 급여 월입니다.',
      data: {
        payroll_period,
        locked_at: row.locked_at,
        created: !!created
      }
    });
  } catch (error) {
    console.error('급여 월 확정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

/** PDF 첨부 급여 명세서를 직원 이메일로 발송 (클라이언트 생성 PDF base64) */
export const sendPayrollPayslip = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const pdf_base64 = String(req.body?.pdf_base64 || '');
    const { tenant_id, company_id, id: senderId } = req.user;

    if (!pdf_base64 || pdf_base64.length < 20) {
      return res.status(400).json({ success: false, message: 'PDF 데이터가 없습니다.' });
    }

    const companyRow = await Company.findOne({
      where: { id: company_id, tenant_id }
    });

    const senderRow = await User.findOne({
      where: { id: senderId, tenant_id, company_id },
      attributes: ['id', 'settings']
    });

    const mailOpts = getResolvedMailTransportOptions(companyRow, senderRow);
    if (!mailOpts) {
      return res.status(503).json({
        success: false,
        message:
          '메일 서버가 설정되지 않았습니다. 시스템 설정의 보내는 메일 서버를 입력하거나, 서버 환경변수(EMAIL_HOST, EMAIL_USER, EMAIL_PASS)를 설정하세요.'
      });
    }

    const payroll = await (Payroll as any).findOne({
      where: { id, tenant_id, company_id, is_active: true },
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'email', 'username', 'employee_number']
        }
      ]
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    const emp = (payroll as any).employee;
    const to = String(emp?.email || '').trim();
    if (!to) {
      return res.status(400).json({ success: false, message: '직원 이메일이 등록되어 있지 않습니다.' });
    }

    const b64 = pdf_base64.includes(',') ? pdf_base64.split(',')[1] : pdf_base64;
    const pdfBuffer = Buffer.from(b64, 'base64');
    if (!bufferLooksLikePdf(pdfBuffer)) {
      return res.status(400).json({ success: false, message: '유효한 PDF 파일이 아닙니다.' });
    }

    const transporter = nodemailer.createTransport(buildNodemailerTransportOptions(mailOpts));

    const period = String((payroll as any).payroll_period || '');
    const extra =
      (payroll as any).extra_fields && typeof (payroll as any).extra_fields === 'object'
        ? ((payroll as any).extra_fields as Record<string, unknown>)
        : {};
    const uname =
      String(extra.employee_name || '').trim() ||
      String(emp?.username || '').trim() ||
      'Employee';
    const empId =
      String(extra.emp_id || '').trim() || String(emp?.employee_number || '').trim();
    const netSalary = Number((payroll as any).net_salary);
    const companyLabel = shortCompanyNameForMail((companyRow as any)?.name);
    const mailVars = { name: uname, company: companyLabel, period };
    const subject = fillPayslipMailTemplate(DEFAULT_PAYSLIP_MAIL_SUBJECT, mailVars);
    const bodyText = fillPayslipMailTemplate(DEFAULT_PAYSLIP_MAIL_BODY, mailVars);
    const bodyHtml = bodyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');

    await transporter.sendMail({
      from: mailOpts.from,
      to,
      subject,
      text: bodyText,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#111827;line-height:1.55;max-width:640px;">
          ${bodyHtml}
        </div>
      `,
      attachments: [
        {
          filename: `Payslip (${period || 'Unknown'}) (${uname})`.replace(/[\\/:*?"<>|]/g, '_') + '.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    await persistPayslipDelivery({
      tenant_id,
      company_id,
      senderId,
      to,
      period,
      employeeName: uname,
      empId,
      netSalary: Number.isFinite(netSalary) ? netSalary : null,
      userId: emp?.id ?? null,
      pdfBuffer
    });

    res.json({
      success: true,
      message: '메일을 발송했고, 급여 명세서에 저장했습니다.',
      data: { saved_for_user: true }
    });
  } catch (error) {
    console.error('급여 명세서 메일 오류:', error);
    res.status(500).json({ success: false, message: '메일 발송에 실패했습니다.' });
  }
};

/**
 * 엑셀 업로드 급여 리스트용 명세서 발송.
 * 엑셀 원본은 저장하지 않음. PDF는 메일로 보내고,
 * 수신 이메일이 Hyvision One 사용자와 일치하면 내 급여 명세서에서 조회할 수 있게 보관한다.
 */
export const sendImportedPayslip = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: senderId } = req.user;
    const to = String(req.body?.to || '').trim();
    const employeeName = String(req.body?.employee_name || '').trim().slice(0, 120);
    const period = String(req.body?.payroll_period || '').trim().slice(0, 30);
    const empId = String(req.body?.emp_id || '').trim().slice(0, 50);
    const netSalaryRaw = req.body?.net_salary;
    const netSalary =
      netSalaryRaw === undefined || netSalaryRaw === null || netSalaryRaw === ''
        ? null
        : Number(netSalaryRaw);
    const subject = String(req.body?.subject || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 200);
    const message = String(req.body?.message || '').trim().slice(0, 5000);
    const pdfBase64 = String(req.body?.pdf_base64 || '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ success: false, message: '유효한 수신 이메일 주소가 필요합니다.' });
    }
    if (!pdfBase64 || pdfBase64.length < 20 || pdfBase64.length > 20 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: '유효한 PDF 데이터가 필요합니다.' });
    }

    const companyRow = await Company.findOne({ where: { id: company_id, tenant_id } });
    const senderRow = await User.findOne({
      where: { id: senderId, tenant_id, company_id },
      attributes: ['id', 'settings']
    });
    const mailOpts = getResolvedMailTransportOptions(companyRow, senderRow);
    if (!mailOpts) {
      return res.status(503).json({
        success: false,
        message: '메일 서버가 설정되지 않았습니다. 시스템 설정에서 보내는 메일 서버를 입력하세요.'
      });
    }

    const safeMessage = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');
    const b64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const pdfBuffer = Buffer.from(b64, 'base64');
    if (!bufferLooksLikePdf(pdfBuffer)) {
      return res.status(400).json({ success: false, message: '유효한 PDF 파일이 아닙니다.' });
    }
    const filenamePart = `Payslip (${period || 'Unknown'}) (${employeeName || 'Employee'})`
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 120);

    const mailVars = {
      name: employeeName || 'Employee',
      company: shortCompanyNameForMail((companyRow as any)?.name),
      period
    };
    const fallbackSubject = fillPayslipMailTemplate(DEFAULT_PAYSLIP_MAIL_SUBJECT, mailVars);
    const fallbackBody = fillPayslipMailTemplate(DEFAULT_PAYSLIP_MAIL_BODY, mailVars);
    const fallbackHtml = fallbackBody
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');

    const transporter = nodemailer.createTransport(buildNodemailerTransportOptions(mailOpts));
    await transporter.sendMail({
      from: mailOpts.from,
      to,
      subject: subject || fallbackSubject,
      text: message || fallbackBody,
      html: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;">${
        safeMessage || fallbackHtml
      }</div>`,
      attachments: [{ filename: `${filenamePart}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
    });

    await persistPayslipDelivery({
      tenant_id,
      company_id,
      senderId,
      to,
      period,
      employeeName: employeeName || 'Employee',
      empId,
      netSalary: Number.isFinite(netSalary as number) ? netSalary : null,
      userId: null,
      pdfBuffer
    });

    return res.json({
      success: true,
      message: '메일을 발송했고, 급여 명세서에 저장했습니다.',
      data: { saved_for_user: true }
    });
  } catch (error) {
    console.error('업로드 급여 명세서 메일 오류:', error);
    return res.status(500).json({ success: false, message: '메일 발송에 실패했습니다.' });
  }
};

function toMoneyNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(String(value ?? '').replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** 엑셀 파싱 행을 payrolls 테이블에 일괄 저장 (이메일·사번 매칭) */
export const importPayrollsFromRows = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const payroll_period = normalizePayrollPeriodInput(String(req.body?.payroll_period || '').trim());
    if (!payroll_period) {
      return res.status(400).json({
        success: false,
        message: '급여 기간(payroll_period)이 필요하며 YYYY-MM 형식이어야 합니다.'
      });
    }

    if (!parsePayrollPeriod(payroll_period)) {
      return res.status(400).json({
        success: false,
        message: '급여 기간은 YYYY-MM 형식이어야 합니다.'
      });
    }

    if (isPayrollPeriodAfterCurrentMonth(payroll_period)) {
      return res.status(400).json({
        success: false,
        message: '아직 도래하지 않은 급여 월은 생성할 수 없습니다.'
      });
    }

    if (await isPayrollPeriodLocked(tenant_id, company_id, payroll_period)) {
      return res.status(403).json({
        success: false,
        message: '해당 급여 월은 확정되어 일괄 생성할 수 없습니다.'
      });
    }

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: '가져올 급여 행(rows)이 없습니다.'
      });
    }

    const replaceMatched = req.body?.replace_matched !== false;

    const employees = await (User as any).findAll({
      where: { tenant_id, company_id, status: 'active' },
      attributes: [
        'id',
        'username',
        'email',
        'department',
        'position',
        'employee_number',
        'birth_date',
        'hire_date'
      ]
    });

    const byEmail = new Map<string, any>();
    const byEmpNo = new Map<string, any>();
    for (const emp of employees) {
      const email = String(emp.email || '')
        .trim()
        .toLowerCase();
      if (email && !byEmail.has(email)) byEmail.set(email, emp);
      const empNo = String(emp.employee_number || '')
        .trim()
        .toLowerCase();
      if (empNo && !byEmpNo.has(empNo)) byEmpNo.set(empNo, emp);
    }

    type SkippedRow = { row: number; email: string; reason: string };
    const skipped: SkippedRow[] = [];
    const matchedPayloads: Array<{
      employee: any;
      rowIndex: number;
      email: string;
      empId: string;
      employeeName: string;
      basic_salary: number;
      overtime_pay: number;
      bonus: number;
      allowances: number;
      deductions: number;
      gross_salary: number;
      net_salary: number;
      tax_amount: number;
      extra_fields: Record<string, unknown>;
    }> = [];
    const matchedEmployeeIds = new Set<number>();

    rows.forEach((raw: any, index: number) => {
      const rowNum = index + 1;
      const email = String(raw?.employee_email || '')
        .trim()
        .toLowerCase();
      const empId = String(raw?.emp_id || '').trim();
      const empIdKey = empId.toLowerCase();

      let employee: any = null;
      if (email) employee = byEmail.get(email) || null;
      if (!employee && empIdKey) employee = byEmpNo.get(empIdKey) || null;

      if (!employee) {
        skipped.push({
          row: rowNum,
          email: email || empId || '',
          reason: !email && !empId ? 'missing_email_and_emp_id' : 'no_matching_user'
        });
        return;
      }

      if (matchedEmployeeIds.has(employee.id)) {
        skipped.push({
          row: rowNum,
          email: email || String(employee.email || ''),
          reason: 'duplicate_employee'
        });
        return;
      }
      matchedEmployeeIds.add(employee.id);

      const basic_salary = toMoneyNumber(raw?.basic_salary);
      const overtime_pay = toMoneyNumber(raw?.overtime_pay);
      const bonus = toMoneyNumber(raw?.bonus);
      const allowances = toMoneyNumber(raw?.allowances);
      const deductions = toMoneyNumber(raw?.deductions);
      const gross_salary = toMoneyNumber(raw?.gross_salary);
      const net_salary = toMoneyNumber(raw?.net_salary);
      const tax_amount = toMoneyNumber(raw?.tax_amount);
      const employeeName =
        String(raw?.employee_name || '').trim() || String(employee.username || '').trim();

      const incomingExtra =
        raw?.extra_fields && typeof raw.extra_fields === 'object' && !Array.isArray(raw.extra_fields)
          ? { ...(raw.extra_fields as Record<string, unknown>) }
          : {};

      const birth = employee.birth_date ? String(employee.birth_date).split('T')[0] : '';
      const hire = employee.hire_date ? String(employee.hire_date).split('T')[0] : '';

      const extra_fields: Record<string, unknown> = {
        ...incomingExtra,
        emp_id: empId || String(employee.employee_number || '').trim() || incomingExtra.emp_id || '',
        employee_email: email || String(employee.email || '').trim().toLowerCase(),
        employee_name: employeeName,
        department:
          String(raw?.department || incomingExtra.department || employee.department || '').trim(),
        position: String(raw?.position || incomingExtra.position || employee.position || '').trim(),
        birth_date: String(incomingExtra.birth_date || birth || ''),
        joining_date: String(incomingExtra.joining_date || hire || ''),
        working_month: payroll_period,
        import_source: 'excel_bulk_import'
      };

      matchedPayloads.push({
        employee,
        rowIndex: rowNum,
        email: String(extra_fields.employee_email),
        empId: String(extra_fields.emp_id),
        employeeName,
        basic_salary,
        overtime_pay,
        bonus,
        allowances,
        deductions,
        gross_salary,
        net_salary,
        tax_amount,
        extra_fields
      });
    });

    const employeeIds = matchedPayloads.map((m) => m.employee.id);
    let replaced = 0;

    const created = await sequelize.transaction(async (transaction) => {
      if (replaceMatched && employeeIds.length > 0) {
        const [deactivated] = await (Payroll as any).update(
          { is_active: false },
          {
            where: {
              tenant_id,
              company_id,
              is_active: true,
              employee_id: { [Op.in]: employeeIds },
              ...sameMonthPayrollPeriodWhere(payroll_period)
            },
            transaction
          }
        );
        replaced = Number(deactivated) || 0;
      }

      let createdCount = 0;
      for (const item of matchedPayloads) {
        await (Payroll as any).create(
          {
            tenant_id,
            company_id,
            employee_id: item.employee.id,
            payroll_period,
            basic_salary: item.basic_salary,
            overtime_pay: item.overtime_pay,
            bonus: item.bonus,
            allowances: item.allowances,
            deductions: item.deductions,
            gross_salary: item.gross_salary,
            net_salary: item.net_salary,
            tax_amount: item.tax_amount,
            status: 'pending',
            created_by: user_id,
            is_active: true,
            extra_fields: item.extra_fields
          },
          { transaction }
        );
        createdCount += 1;
      }
      return createdCount;
    });

    return res.status(201).json({
      success: true,
      message: `급여 ${created}건을 가져왔습니다.${replaced > 0 ? ` (기존 ${replaced}건 비활성화)` : ''}${
        skipped.length ? ` / 건너뜀 ${skipped.length}건` : ''
      }`,
      data: {
        created,
        replaced,
        skipped,
        matched: matchedPayloads.length
      }
    });
  } catch (error) {
    console.error('급여 엑셀 일괄 가져오기 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

/** 로그인한 직원 본인의 급여 목록 (employee_id = 본인) */
export const getMyPayrolls = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: userId } = req.user;
    const period = String(req.query?.period || '').trim();
    const periodNorm = period ? normalizePayrollPeriodInput(period) : '';

    const where: any = {
      tenant_id,
      company_id,
      employee_id: userId,
      is_active: true
    };
    if (periodNorm) {
      Object.assign(where, sameMonthPayrollPeriodWhere(periodNorm));
    } else if (period) {
      where.payroll_period = period;
    }

    const rows = await (Payroll as any).findAll({
      where,
      order: [
        ['payroll_period', 'DESC'],
        ['created_at', 'DESC'],
        ['id', 'DESC']
      ],
      attributes: [
        'id',
        'payroll_period',
        'basic_salary',
        'overtime_pay',
        'bonus',
        'allowances',
        'deductions',
        'gross_salary',
        'net_salary',
        'tax_amount',
        'status',
        'payment_date',
        'extra_fields',
        'created_at'
      ]
    });

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('내 급여 목록 오류:', error);
    return res.status(500).json({ success: false, message: '급여 목록을 불러오지 못했습니다.' });
  }
};

/** 로그인한 사용자 본인의 발송 급여 명세서 목록 (메일 또는 user_id) */
export const getMyPayslips = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: userId, email: userEmail } = req.user;
    const period = String(req.query?.period || '').trim();
    const q = String(req.query?.q || '').trim();
    const emailLower = String(userEmail || '').trim().toLowerCase();

    const ownerClause: any[] = [{ user_id: userId }];
    if (emailLower) {
      ownerClause.push(
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('recipient_email')), emailLower)
      );
    }

    const where: any = {
      tenant_id,
      company_id,
      is_active: true,
      [Op.or]: ownerClause
    };
    if (period) where.payroll_period = period;
    if (q) {
      where[Op.and] = [
        {
          [Op.or]: [
            { employee_name: { [Op.iLike]: `%${q}%` } },
            { payroll_period: { [Op.iLike]: `%${q}%` } },
            { emp_id: { [Op.iLike]: `%${q}%` } }
          ]
        }
      ];
    }

    const rows = await (PayslipDelivery as any).findAll({
      where,
      order: [
        ['payroll_period', 'DESC'],
        ['sent_at', 'DESC'],
        ['id', 'DESC']
      ],
      attributes: [
        'id',
        'payroll_period',
        'employee_name',
        'recipient_email',
        'emp_id',
        'net_salary',
        'sent_at',
        'created_at'
      ]
    });

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('내 급여 명세서 목록 오류:', error);
    return res.status(500).json({ success: false, message: '급여 명세서 목록을 불러오지 못했습니다.' });
  }
};

/** 본인 급여 명세서 PDF 다운로드 */
export const downloadMyPayslip = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: userId, email: userEmail } = req.user;
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, message: '잘못된 요청입니다.' });
    }

    const emailLower = String(userEmail || '').trim().toLowerCase();
    const ownerClause: any[] = [{ user_id: userId }];
    if (emailLower) {
      ownerClause.push(
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('recipient_email')), emailLower)
      );
    }

    const row = await (PayslipDelivery as any).findOne({
      where: {
        id,
        tenant_id,
        company_id,
        is_active: true,
        [Op.or]: ownerClause
      }
    });
    if (!row) {
      return res.status(404).json({ success: false, message: '급여 명세서를 찾을 수 없습니다.' });
    }

    const filePath = resolveStoredUploadPath(row.pdf_path, row.pdf_url);
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: '명세서 파일이 없습니다. 급여 관리에서 다시 발송해 주세요.'
      });
    }
    const fileBuf = await fs.promises.readFile(filePath);
    if (!bufferLooksLikePdf(fileBuf)) {
      return res.status(404).json({
        success: false,
        message: '명세서 파일이 없습니다. 급여 관리에서 다시 발송해 주세요.'
      });
    }

    const downloadName = `Payslip (${row.payroll_period || 'Unknown'}) (${row.employee_name || 'Employee'})`
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 120) + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    return res.send(fileBuf);
  } catch (error) {
    console.error('내 급여 명세서 다운로드 오류:', error);
    return res.status(500).json({ success: false, message: '다운로드에 실패했습니다.' });
  }
};

// 직원 목록 조회 (급여 생성용)
export const getEmployees = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;

    const employees = await (User as any).findAll({
      where: { tenant_id, company_id, status: 'active' },
      attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
    });

    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('직원 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 통계 조회
export const getPayrollStats = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { period = '' } = req.query;

    const whereClause: any = { tenant_id, company_id };
    
    if (period) {
      whereClause.payroll_period = period;
    }

    const stats = await (Payroll as any).findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('gross_salary')), 'total_gross'],
        [sequelize.fn('SUM', sequelize.col('net_salary')), 'total_net'],
        [sequelize.fn('SUM', sequelize.col('tax_amount')), 'total_tax'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_count']
      ]
    });

    // 상태별 통계
    const statusStats = await (Payroll as any).findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    res.json({
      success: true,
      data: {
        summary: stats,
        statusBreakdown: statusStats
      }
    });
  } catch (error) {
    console.error('급여 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};
