import ExcelJS from 'exceljs';
import { recalculatePayrollRow } from './payrollGridUtils';
import type { PayrollGridRow } from './payrollGridTypes';

export type PayrollImportField =
  | 'emp_id'
  | 'employee_name'
  | 'employee_email'
  | 'department'
  | 'position'
  | 'bank_account'
  | 'ifsc'
  | 'bank_name'
  | 'joining_date'
  | 'birth_date'
  | 'basic_salary'
  | 'house_rent_allowance'
  | 'other_allowance'
  | 'food_allowance'
  | 'total_salary'
  | 'total_day_of_month'
  | 'unpaid_leave'
  | 'days_worked'
  | 'day_ot_hour'
  | 'night_ot_hour'
  | 'ot_rate'
  | 'overtime_pay'
  | 'transport_allowance'
  | 'sum_total'
  | 'pf_employee'
  | 'esic_employee'
  | 'tds'
  | 'pt'
  | 'deduct_this_month'
  | 'net_salary_payable';

const SUMMABLE_FIELDS = new Set<PayrollImportField>([
  'other_allowance',
  'food_allowance',
  'transport_allowance',
  'deduct_this_month',
]);

/** PayslipSendSystem FIELD_OPTIONS 와 동일 스타일의 헤더 별칭 */
const FIELD_OPTIONS: Array<{ value: PayrollImportField; aliases: string[] }> = [
  { value: 'emp_id', aliases: ['empid', 'employeeid', 'emp id', 'employee id', 'emp. id'] },
  { value: 'employee_name', aliases: ['name of employee', 'employee name', 'name'] },
  { value: 'employee_email', aliases: ['email id', 'emailid', 'e-mail', 'email'] },
  { value: 'department', aliases: ['department', 'dept'] },
  { value: 'position', aliases: ['designation', 'position'] },
  {
    value: 'bank_account',
    aliases: ['bank account', 'account no', 'account number', 'a/c no', 'a/c', 'ac'],
  },
  { value: 'ifsc', aliases: ['ifsc code', 'ifsc'] },
  { value: 'bank_name', aliases: ['bank name', 'bank'] },
  { value: 'joining_date', aliases: ['joining date', 'date of joining', 'date of join', 'doj'] },
  { value: 'birth_date', aliases: ['date of birth', 'birth date', 'dob', 'birthday'] },
  { value: 'basic_salary', aliases: ['basic salary', 'basic'] },
  { value: 'house_rent_allowance', aliases: ['house rent allowance', 'hra', 'hrd'] },
  {
    value: 'other_allowance',
    aliases: [
      'discretionary performance allowance',
      'long service allowance',
      'team leader allowance',
      'team reader allowance',
      'team leader',
      'team reader',
      'korean language allowance',
      'koeran language',
      'korean language',
      'korean',
      'koeran',
      'medical allowance',
      'night shift allowance',
      'day shift allowance',
      'special allowance',
      'site allowance',
      'other site allowance',
      'other (site) allowance',
      'other allowances',
      'other allowance',
    ],
  },
  {
    value: 'food_allowance',
    aliases: [
      'food allowance',
      'food allwance',
      'meals allowance',
      'meals allowanc',
      'meals',
      'meal allowance',
      'food',
    ],
  },
  { value: 'total_salary', aliases: ['total salary'] },
  {
    value: 'total_day_of_month',
    aliases: ['total day of month', 'total days of month', 'total days', 'days in month', 'twdf'],
  },
  { value: 'unpaid_leave', aliases: ['unpaid leave', 'lop'] },
  { value: 'days_worked', aliases: ['days worked', 'working days'] },
  {
    value: 'day_ot_hour',
    aliases: [
      'ot day hours',
      'ot/day hours',
      'day ot hours',
      'ot day hour',
      'day ot hour',
      'ot/hour',
      'ot hour',
      'ot hours',
    ],
  },
  {
    value: 'night_ot_hour',
    aliases: [
      'ot night hours',
      'ot/night hours',
      'night ot hours',
      'ot night hour',
      'night ot hour',
    ],
  },
  { value: 'ot_rate', aliases: ['ot rate', 'ot/rate'] },
  {
    value: 'overtime_pay',
    aliases: ['overtime pay', 'ot amount', 'ot pay', 'ot amt', 'overtime', 'ot'],
  },
  {
    value: 'transport_allowance',
    aliases: [
      'transportation allowance',
      'transport allowance',
      'transport/travel allowance',
      'travel allowance',
      'extra allowance',
    ],
  },
  { value: 'sum_total', aliases: ['sum total', 'gross total', 'gross pay', 'gross salary'] },
  {
    value: 'pf_employee',
    aliases: ['pf employee contribution', 'employee pf contribution', 'pf employee', 'epf'],
  },
  {
    value: 'esic_employee',
    aliases: [
      'esic employee contribution',
      'esi employee contribution',
      'employee esic contribution',
      'employee esi contribution',
      'esic employee',
      'esi employee',
    ],
  },
  { value: 'tds', aliases: ['tds'] },
  { value: 'pt', aliases: ['professional tax', 'pt'] },
  {
    value: 'deduct_this_month',
    aliases: [
      'amount to be deducted this month',
      'deducted this month',
      'deduct this month',
      'total deduction',
      'total deductions',
      'vpf',
    ],
  },
  {
    value: 'net_salary_payable',
    aliases: ['net salary payable', 'net salary', 'salary payable', 'net pay'],
  },
];

export type PayrollExcelDraftRow = {
  row_no: number;
  employee_email: string;
  emp_id: string;
  employee_name: string;
  department: string;
  position: string;
  basic_salary: number;
  overtime_pay: number;
  bonus: number;
  allowances: number;
  deductions: number;
  gross_salary: number;
  net_salary: number;
  tax_amount: number;
  match_hint: string;
  extra_fields: Record<string, unknown>;
};

const cellToText = (value: unknown): string => {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s || /^\[object\s+object\]$/i.test(s)) return '';
    if (/^=/.test(s) || /^_xlfn/i.test(s)) return '';
    return s;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) => (part && typeof part === 'object' ? String((part as any).text ?? '') : ''))
        .join('')
        .trim();
    }
    if (obj.result != null && obj.result !== '') return cellToText(obj.result);
    if (obj.text != null) return cellToText(obj.text);
    if (obj.hyperlink != null && obj.text == null) return String(obj.hyperlink).trim();
    const formulaRaw = obj.formula != null ? String(obj.formula) : '';
    if (formulaRaw) {
      const normalized = formulaRaw.startsWith('=') ? formulaRaw : `=${formulaRaw}`;
      const constant = normalized.match(/^=\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (constant) return constant[1];
    }
  }
  return '';
};

const cellFormulaText = (cell: ExcelJS.Cell): string => {
  const direct = String((cell as any).formula || '').trim();
  if (direct) return direct.startsWith('=') ? direct : `=${direct}`;
  const v = cell.value as any;
  if (v && typeof v === 'object') {
    if (v.formula) {
      const f = String(v.formula).trim();
      return f.startsWith('=') ? f : `=${f}`;
    }
    if (v.sharedFormula) {
      const f = String(v.sharedFormula).trim();
      return f.startsWith('=') ? f : `=${f}`;
    }
  }
  return '';
};

const resolveExcelCell = (cell: ExcelJS.Cell): string => {
  const formula = cellFormulaText(cell);
  const fromValue = cellToText(cell.value);
  if (fromValue) return fromValue;
  const cached = (cell as any).result;
  if (cached != null && cached !== '') return cellToText(cached);
  if (formula) {
    const constant = formula.match(/^=\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (constant) return constant[1];
  }
  return '';
};

const readSheetMatrix = (sheet: ExcelJS.Worksheet): string[][] => {
  const texts: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const lastCol = Math.max(1, row.cellCount || 0);
    const rowTexts: string[] = [];
    for (let col = 1; col <= lastCol; col += 1) {
      rowTexts.push(resolveExcelCell(row.getCell(col)));
    }
    texts.push(rowTexts);
  });
  return texts;
};

const normalize = (value: unknown) => {
  let key = cellToText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  key = key
    .replace(/koeran/g, 'korean')
    .replace(/teamreader/g, 'teamleader')
    .replace(/allowanc(?!e)/g, 'allowance');
  return key;
};

const numberValue = (value: unknown) => {
  const n = Number(cellToText(value).replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const scoreFieldAlias = (headerNorm: string, alias: string): number => {
  const a = normalize(alias);
  if (!headerNorm || !a) return 0;
  if (headerNorm.includes('employer')) return 0;
  if (
    headerNorm === 'no' ||
    headerNorm === 'sno' ||
    headerNorm === 'increasesalarydate' ||
    headerNorm === 'advancepaymentamount' ||
    headerNorm === 'balanceofsalaryadvance' ||
    headerNorm === 'previousmonthadjustment' ||
    headerNorm === 'previousmonthadjustemnt' ||
    headerNorm === 'monthtotalcost' ||
    headerNorm === 'accountcash' ||
    headerNorm === 'paymentdate' ||
    headerNorm === 'dayshift' ||
    headerNorm === 'nightshift' ||
    headerNorm === 'workingmonth' ||
    headerNorm === 'workingmonths'
  ) {
    return 0;
  }
  if (headerNorm === a) return 1000 + a.length;
  if (headerNorm.startsWith(a) || headerNorm.includes(a)) {
    if (a.length <= 2 && headerNorm !== a) return 0;
    if (a.length <= 3 && headerNorm.length > a.length + 6 && !headerNorm.startsWith(a)) return 0;
    return 500 + a.length;
  }
  return 0;
};

const matchFieldForHeader = (
  header: string,
  used: Set<PayrollImportField>
): PayrollImportField | null => {
  const key = normalize(header);
  if (!key) return null;
  let best: { field: PayrollImportField; score: number } | null = null;
  for (const option of FIELD_OPTIONS) {
    if (used.has(option.value) && !SUMMABLE_FIELDS.has(option.value)) continue;
    for (const alias of option.aliases) {
      const score = scoreFieldAlias(key, alias);
      if (score > 0 && (!best || score > best.score)) {
        best = { field: option.value, score };
      }
    }
  }
  return best?.field ?? null;
};

const sumMappedNumbers = (
  source: Record<string, unknown>,
  mapping: Record<number, PayrollImportField>,
  field: PayrollImportField
): number => {
  let total = 0;
  Object.entries(mapping).forEach(([index, mappedField]) => {
    if (mappedField === field) total += numberValue(source[index]);
  });
  return total;
};

const firstMappedText = (
  source: Record<string, unknown>,
  mapping: Record<number, PayrollImportField>,
  field: PayrollImportField
): string => {
  for (const [index, mappedField] of Object.entries(mapping)) {
    if (mappedField !== field) continue;
    const text = cellToText(source[index]);
    if (text) return text;
  }
  return '';
};

const findHeaderRow = (rows: string[][]) => {
  let bestIndex = -1;
  let bestScore = 0;
  rows.slice(0, 30).forEach((row, index) => {
    const score = row.reduce((count, cell) => {
      const header = cellToText(cell);
      if (!header) return count;
      return count + (matchFieldForHeader(header, new Set()) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  if (bestScore >= 2) return bestIndex;
  return Math.max(
    0,
    rows.findIndex((row) => row.filter((cell) => cellToText(cell)).length >= 5)
  );
};

const emptyGridRow = (partial: Partial<PayrollGridRow>): PayrollGridRow => ({
  id: -1,
  row_no: 0,
  emp_id: '',
  bank_account: '',
  ifsc: '',
  bank_name: '',
  employee_email: '',
  department: '',
  employee_name: '',
  position: '',
  birth_date: '',
  joining_date: '',
  working_month: '',
  basic_salary: 0,
  house_rent_allowance: 0,
  other_allowance: 0,
  food_allowance: 0,
  total_salary: 0,
  total_day_of_month: '30',
  unpaid_leave: '0',
  days_worked: '30',
  ot_rate: 0,
  day_ot_hour: 0,
  night_ot_hour: 0,
  transport_allowance: 0,
  overtime: 0,
  sum_total: 0,
  pf_employee: '0',
  pf_employer: '0',
  esic_employee: '0',
  esic_employer: '0',
  tds: 0,
  pt: '0',
  deduct_this_month: 0,
  net_salary_payable: 0,
  ...partial,
});

/**
 * 급여 엑셀 첫 시트 파싱 → DB bulk-import 용 draft 행
 */
export async function parsePayrollExcelFile(
  file: File,
  opts?: { payrollPeriod?: string; companyId?: number | null }
): Promise<{ rows: PayrollExcelDraftRow[]; detectedPeriod: string; headers: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('NO_SHEET');

  const sheetRows = readSheetMatrix(sheet);
  const headerIndex = findHeaderRow(sheetRows);
  const headers = sheetRows[headerIndex].map(
    (cell, index) => cellToText(cell).replace(/\s+/g, ' ').trim() || `Column ${index + 1}`
  );

  const rawRows = sheetRows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cellToText(cell)))
    .filter((row) => {
      const cells = row.map(cellToText);
      const joined = cells.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
      if (!joined) return false;
      if (/^total\b/.test(joined) || joined.includes('total amount')) return false;
      if (joined.includes('daily wage employee')) return false;
      if (joined.includes('other than')) return false;
      if (/^(no\.?|name|emp\s*id|department)\b/.test(joined) && cells.filter(Boolean).length <= 4) {
        return false;
      }
      const nameCell = cells.find((c) => c.trim()) || '';
      if (/^(name|no\.?|emp\s*id)$/i.test(nameCell.trim())) return false;
      return true;
    })
    .map((row) =>
      Object.fromEntries(headers.map((_, index) => [String(index), cellToText(row[index])]))
    );

  const mapping: Record<number, PayrollImportField> = {};
  const used = new Set<PayrollImportField>();
  headers.forEach((header, index) => {
    const found = matchFieldForHeader(header, used);
    if (!found) return;
    mapping[index] = found;
    if (!SUMMABLE_FIELDS.has(found)) used.add(found);
  });

  const payrollPeriod = String(opts?.payrollPeriod || '').trim();
  const rows: PayrollExcelDraftRow[] = rawRows.map((source, index) => {
    const basic = sumMappedNumbers(source, mapping, 'basic_salary');
    const hra = sumMappedNumbers(source, mapping, 'house_rent_allowance');
    const other = sumMappedNumbers(source, mapping, 'other_allowance');
    const food = sumMappedNumbers(source, mapping, 'food_allowance');
    const transport = sumMappedNumbers(source, mapping, 'transport_allowance');
    const totalSalary =
      sumMappedNumbers(source, mapping, 'total_salary') || basic + hra + other + food;
    const dayOt = sumMappedNumbers(source, mapping, 'day_ot_hour');
    const nightOt = sumMappedNumbers(source, mapping, 'night_ot_hour');
    const otRate = sumMappedNumbers(source, mapping, 'ot_rate');
    const overtimePayMapped = sumMappedNumbers(source, mapping, 'overtime_pay');
    const computedOtPay = Math.round(otRate * (dayOt + nightOt));
    const overtime_pay = overtimePayMapped > 0 ? Math.round(overtimePayMapped) : computedOtPay;
    const pfEmp = sumMappedNumbers(source, mapping, 'pf_employee');
    const esicEmp = sumMappedNumbers(source, mapping, 'esic_employee');
    const tdsAmt = sumMappedNumbers(source, mapping, 'tds');
    const ptAmt = sumMappedNumbers(source, mapping, 'pt');
    const extraDeduct = sumMappedNumbers(source, mapping, 'deduct_this_month');
    const deductions = Math.round(
      extraDeduct > 0 && pfEmp + esicEmp + tdsAmt + ptAmt === 0
        ? extraDeduct
        : pfEmp + esicEmp + tdsAmt + ptAmt + extraDeduct
    );
    const grossMapped = sumMappedNumbers(source, mapping, 'sum_total');
    const netMapped = sumMappedNumbers(source, mapping, 'net_salary_payable');

    const email = firstMappedText(source, mapping, 'employee_email').trim();
    const empId = firstMappedText(source, mapping, 'emp_id').trim();
    const name = firstMappedText(source, mapping, 'employee_name').trim();
    const department = firstMappedText(source, mapping, 'department').trim();
    const position = firstMappedText(source, mapping, 'position').trim();

    const draftGrid = emptyGridRow({
      emp_id: empId,
      bank_account: firstMappedText(source, mapping, 'bank_account'),
      ifsc: firstMappedText(source, mapping, 'ifsc'),
      bank_name: firstMappedText(source, mapping, 'bank_name'),
      employee_email: email,
      department,
      employee_name: name,
      position,
      birth_date: firstMappedText(source, mapping, 'birth_date'),
      joining_date: firstMappedText(source, mapping, 'joining_date'),
      working_month: payrollPeriod,
      basic_salary: basic,
      house_rent_allowance: hra,
      other_allowance: other,
      food_allowance: food,
      total_salary: totalSalary,
      total_day_of_month: String(
        firstMappedText(source, mapping, 'total_day_of_month') ||
          sumMappedNumbers(source, mapping, 'total_day_of_month') ||
          30
      ),
      unpaid_leave: String(
        firstMappedText(source, mapping, 'unpaid_leave') ||
          sumMappedNumbers(source, mapping, 'unpaid_leave') ||
          0
      ),
      days_worked: String(
        firstMappedText(source, mapping, 'days_worked') ||
          sumMappedNumbers(source, mapping, 'days_worked') ||
          ''
      ),
      day_ot_hour: dayOt,
      night_ot_hour: nightOt,
      ot_rate: otRate,
      transport_allowance: transport,
      overtime: overtime_pay,
      sum_total: grossMapped,
      pf_employee: String(pfEmp),
      esic_employee: String(esicEmp),
      tds: tdsAmt,
      pt: String(ptAmt),
      deduct_this_month: deductions,
      net_salary_payable: netMapped,
      ot_eligible: dayOt > 0 || nightOt > 0 || overtime_pay > 0,
      ot_manual: overtimePayMapped > 0,
    });

    const recalculated = recalculatePayrollRow(draftGrid, {
      companyId: opts?.companyId ?? null,
      payrollMonth: payrollPeriod || undefined,
    });

    const gross_salary = Math.round(
      grossMapped > 0 ? grossMapped : recalculated.sum_total || totalSalary + overtime_pay
    );
    const net_salary = Math.round(
      netMapped > 0 ? netMapped : recalculated.net_salary_payable || gross_salary - deductions
    );
    const allowances = Math.round(hra + other + food + transport);

    let match_hint = '';
    if (email) match_hint = `email: ${email}`;
    else if (empId) match_hint = `emp_id: ${empId}`;
    else match_hint = 'no email/emp_id';

    return {
      row_no: index + 1,
      employee_email: email,
      emp_id: empId,
      employee_name: name,
      department,
      position,
      basic_salary: Math.round(basic || recalculated.basic_salary),
      overtime_pay: Math.round(overtime_pay || recalculated.overtime),
      bonus: 0,
      allowances,
      deductions: Math.round(deductions || recalculated.deduct_this_month),
      gross_salary,
      net_salary,
      tax_amount: Math.round(tdsAmt || recalculated.tds),
      match_hint,
      extra_fields: {
        emp_id: empId,
        employee_email: email,
        employee_name: name,
        department,
        position,
        bank_account: recalculated.bank_account,
        ifsc: recalculated.ifsc,
        bank_name: recalculated.bank_name,
        birth_date: recalculated.birth_date,
        joining_date: recalculated.joining_date,
        house_rent_allowance: String(recalculated.house_rent_allowance),
        other_allowance: String(recalculated.other_allowance),
        food_allowance: String(recalculated.food_allowance),
        transport_allowance: String(recalculated.transport_allowance),
        total_salary: String(recalculated.total_salary),
        total_day_of_month: recalculated.total_day_of_month,
        unpaid_leave: recalculated.unpaid_leave,
        days_worked: recalculated.days_worked,
        day_ot_hour: String(recalculated.day_ot_hour),
        night_ot_hour: String(recalculated.night_ot_hour),
        ot_rate: String(recalculated.ot_rate),
        pf_employee: recalculated.pf_employee,
        esic_employee: recalculated.esic_employee,
        tds: String(recalculated.tds),
        pt: recalculated.pt,
        working_month: payrollPeriod,
      },
    };
  });

  return { rows, detectedPeriod: payrollPeriod, headers };
}
