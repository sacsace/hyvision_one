import React from 'react';
import { mfgService } from '../../services/api';
import { MfgSimpleListPage } from './MfgPhase1Pages';

export const MfgSalesOrdersPage: React.FC = () => (
  <MfgSimpleListPage
    title="판매주문 (SO)"
    description="Sales Order. 승인 후 재고예약·출고로 연결됩니다."
    menuRoutes={['/mfg/sales-orders', '/mfg']}
    columns={[
      { key: 'doc_no', label: '문서번호' },
      { key: 'partner_id', label: '고객ID' },
      { key: 'status', label: '상태' },
      { key: 'order_date', label: '주문일' },
    ]}
    load={() => mfgService.listSalesOrders()}
    mapRows={(res) => res?.data || []}
    createLabel="SO 작성"
    createFields={[
      { key: 'partner_id', label: '고객(Partner) ID', required: true },
      { key: 'item_name', label: '품목명', required: true },
      { key: 'qty', label: '수량', required: true },
      { key: 'unit_price', label: '단가' },
    ]}
    onCreate={async (form) => {
      await mfgService.createSalesOrder({
        partner_id: Number(form.partner_id),
        items: [
          {
            line_no: 1,
            item_name: form.item_name,
            qty: form.qty,
            unit_price: form.unit_price || 0,
            uom: 'EA',
          },
        ],
      });
    }}
  />
);

export const MfgDeliveryChallansPage: React.FC = () => (
  <MfgSimpleListPage
    title="출고증 (Delivery Challan)"
    description="출고 확정 시 재고원장 출고·SO 납품수량이 반영됩니다."
    menuRoutes={['/mfg/delivery-challans', '/mfg']}
    columns={[
      { key: 'doc_no', label: '문서번호' },
      { key: 'so_id', label: 'SO' },
      { key: 'status', label: '상태' },
      { key: 'challan_date', label: '일자' },
    ]}
    load={() => mfgService.listDeliveryChallans()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgStockReservationsPage: React.FC = () => (
  <MfgSimpleListPage
    title="재고예약"
    description="판매주문 대비 가용재고 예약입니다."
    menuRoutes={['/mfg/stock-reservations', '/mfg']}
    columns={[
      { key: 'so_id', label: 'SO' },
      { key: 'product_id', label: '품목' },
      { key: 'qty', label: '수량' },
      { key: 'status', label: '상태' },
    ]}
    load={() => mfgService.listStockReservations()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgCreditNotesPage: React.FC = () => (
  <MfgSimpleListPage
    title="Credit Note"
    description="매출 반품·할인 Credit Note."
    menuRoutes={['/mfg/credit-notes', '/mfg']}
    columns={[
      { key: 'doc_no', label: '문서번호' },
      { key: 'partner_id', label: '고객' },
      { key: 'amount', label: '금액' },
      { key: 'status', label: '상태' },
    ]}
    load={() => mfgService.listCreditNotes()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgBomsPage: React.FC = () => (
  <MfgSimpleListPage
    title="BOM"
    description="다단계 BOM·버전. 승인된 버전만 생산에 사용합니다."
    menuRoutes={['/mfg/boms', '/mfg']}
    columns={[
      { key: 'code', label: '코드' },
      { key: 'name', label: '명칭' },
      { key: 'product_id', label: '완제품ID' },
      { key: 'status', label: '상태' },
    ]}
    load={() => mfgService.listBoms()}
    mapRows={(res) => res?.data || []}
    createLabel="BOM 추가"
    createFields={[
      { key: 'code', label: '코드', required: true },
      { key: 'name', label: '명칭', required: true },
      { key: 'product_id', label: '완제품 Product ID', required: true },
    ]}
    onCreate={async (form) => {
      await mfgService.createBom({
        code: form.code,
        name: form.name,
        product_id: Number(form.product_id),
      });
    }}
  />
);

export const MfgWorkCentersPage: React.FC = () => (
  <MfgSimpleListPage
    title="작업장"
    description="Work Center / 생산라인 마스터."
    menuRoutes={['/mfg/work-centers', '/mfg']}
    columns={[
      { key: 'code', label: '코드' },
      { key: 'name', label: '명칭' },
      { key: 'is_active', label: '활성' },
    ]}
    load={() => mfgService.listWorkCenters()}
    mapRows={(res) => res?.data || []}
    createLabel="작업장 추가"
    createFields={[
      { key: 'code', label: '코드', required: true },
      { key: 'name', label: '명칭', required: true },
    ]}
    onCreate={async (form) => {
      await mfgService.createWorkCenter({ code: form.code, name: form.name });
    }}
  />
);

export const MfgRoutingsPage: React.FC = () => (
  <MfgSimpleListPage
    title="Routing"
    description="공정·작업시간 라우팅."
    menuRoutes={['/mfg/routings', '/mfg']}
    columns={[
      { key: 'code', label: '코드' },
      { key: 'name', label: '명칭' },
      { key: 'product_id', label: '품목' },
    ]}
    load={() => mfgService.listRoutings()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgProductionPlansPage: React.FC = () => (
  <MfgSimpleListPage
    title="생산계획"
    description="월·주·일 생산계획 및 MRP 실행 기반."
    menuRoutes={['/mfg/production-plans', '/mfg']}
    columns={[
      { key: 'plan_code', label: '계획코드' },
      { key: 'plan_date', label: '일자' },
      { key: 'horizon', label: '구간' },
      { key: 'status', label: '상태' },
    ]}
    load={() => mfgService.listProductionPlans()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgWorkOrdersPage: React.FC = () => (
  <MfgSimpleListPage
    title="작업지시 (WO)"
    description="Work Order. Release 후 자재불출·생산실적."
    menuRoutes={['/mfg/work-orders', '/mfg']}
    columns={[
      { key: 'doc_no', label: '문서번호' },
      { key: 'product_id', label: '품목' },
      { key: 'plan_qty', label: '계획수량' },
      { key: 'completed_qty', label: '완료' },
      { key: 'status', label: '상태' },
    ]}
    load={() => mfgService.listWorkOrders()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgMaterialIssuesPage: React.FC = () => (
  <MfgSimpleListPage
    title="자재불출"
    description="WO 연계 자재 불출. 승인 시 재고원장 출고."
    menuRoutes={['/mfg/material-issues', '/mfg']}
    columns={[
      { key: 'doc_no', label: '문서번호' },
      { key: 'work_order_id', label: 'WO' },
      { key: 'status', label: '상태' },
      { key: 'issue_date', label: '일자' },
    ]}
    load={() => mfgService.listMaterialIssues()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgProductionEntriesPage: React.FC = () => (
  <MfgSimpleListPage
    title="생산실적"
    description="합격·불량·Scrap 및 완제품 입고."
    menuRoutes={['/mfg/production-entries', '/mfg']}
    columns={[
      { key: 'work_order_id', label: 'WO' },
      { key: 'entry_date', label: '일자' },
      { key: 'good_qty', label: '합격' },
      { key: 'reject_qty', label: '불량' },
      { key: 'scrap_qty', label: 'Scrap' },
    ]}
    load={() => mfgService.listProductionEntries()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgStandardCostsPage: React.FC = () => (
  <MfgSimpleListPage
    title="표준원가"
    description="BOM Roll-up 기반 표준원가."
    menuRoutes={['/mfg/standard-costs', '/mfg']}
    columns={[
      { key: 'product_id', label: '품목' },
      { key: 'material_cost', label: '재료' },
      { key: 'labour_cost', label: '인건' },
      { key: 'total_cost', label: '합계' },
      { key: 'unit_cost', label: '단위원가' },
    ]}
    load={() => mfgService.listStandardCosts()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgTaxConfigurationsPage: React.FC = () => (
  <MfgSimpleListPage
    title="세무설정"
    description="GST/TDS/TCS 세율·적용일. 하드코딩 금지 — 설정 테이블."
    menuRoutes={['/mfg/tax-configurations', '/mfg']}
    columns={[
      { key: 'tax_type', label: '유형' },
      { key: 'code', label: '코드' },
      { key: 'name', label: '명칭' },
      { key: 'rate', label: '세율' },
      { key: 'effective_from', label: '시작일' },
    ]}
    load={() => mfgService.listTaxConfigurations()}
    mapRows={(res) => res?.data || []}
    createLabel="세율 추가"
    createFields={[
      { key: 'tax_type', label: '유형 (GST/TDS/TCS)', required: true },
      { key: 'code', label: '코드', required: true },
      { key: 'name', label: '명칭', required: true },
      { key: 'rate', label: '세율', required: true },
      { key: 'effective_from', label: '시작일 YYYY-MM-DD', required: true },
    ]}
    onCreate={async (form) => {
      await mfgService.createTaxConfiguration({
        tax_type: form.tax_type,
        code: form.code,
        name: form.name,
        rate: form.rate,
        effective_from: form.effective_from,
      });
    }}
  />
);

export const MfgPeriodLocksPage: React.FC = () => (
  <MfgSimpleListPage
    title="회계·재고 기간 Lock"
    description="마감 기간 수정 금지. 재오픈은 사유와 함께."
    menuRoutes={['/mfg/period-locks', '/mfg']}
    columns={[
      { key: 'period_ym', label: '기간' },
      { key: 'module', label: '모듈' },
      { key: 'is_locked', label: '잠금' },
      { key: 'locked_at', label: '잠근시각' },
    ]}
    load={() => mfgService.listPeriodLocks()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgAutoJournalsPage: React.FC = () => (
  <MfgSimpleListPage
    title="자동분개 연결"
    description="제조 거래 → GL 전표 링크 (pending/posted)."
    menuRoutes={['/mfg/auto-journals', '/mfg']}
    columns={[
      { key: 'source_doc_type', label: '원문서' },
      { key: 'source_doc_id', label: 'ID' },
      { key: 'gl_voucher_id', label: '전표' },
      { key: 'status', label: '상태' },
    ]}
    load={() => mfgService.listAutoJournals()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgBudgetsPage: React.FC = () => (
  <MfgSimpleListPage
    title="공장 예산"
    description="공장(플랜트) 예산 라인. 본사 통합 현황은 본사 포털을 사용합니다."
    menuRoutes={['/mfg/budgets', '/mfg']}
    columns={[
      { key: 'period_ym', label: '기간' },
      { key: 'budget_amount', label: '예산' },
      { key: 'actual_amount', label: '실적' },
      { key: 'gl_account_id', label: '계정' },
    ]}
    load={() => mfgService.listBudgets()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgKpiPage: React.FC = () => (
  <MfgSimpleListPage
    title="일일 KPI"
    description="공장 일별 매출·재고·생산·수율 KPI. 본사 통합 대시보드는 본사 포털을 사용합니다."
    menuRoutes={['/mfg/kpi', '/mfg']}
    columns={[
      { key: 'kpi_date', label: '일자' },
      { key: 'sales_amount', label: '매출' },
      { key: 'inventory_value', label: '재고금액' },
      { key: 'production_qty', label: '생산' },
      { key: 'yield_pct', label: '수율%' },
    ]}
    load={() => mfgService.listKpiDaily()}
    mapRows={(res) => res?.data || []}
  />
);
