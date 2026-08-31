# Head Office Cross-Border Data Access — Review Pack

> Operational reference for India legal / privacy counsel review.  
> **Not a legal opinion.** Rates, retention, and lawful bases are configurable in-app (`/hq/privacy`) and must be validated before production use.

## 1. Personal data categories (may be accessed from Korea HQ)

| Category | Examples | Default HQ visibility |
|----------|----------|------------------------|
| Account identity | userid, name, email, role | Summary roles only |
| HR PII | phone, address, birth date, emergency contact | Blocked unless `hq_can_view_hr_pii` |
| Payroll | salary, bank account for salary | Blocked unless HR PII + elevated access |
| Partner bank | account number, IFSC | Blocked unless `hq_can_view_bank_detail` |
| Cost / BOM | unit cost, BOM components, supplier price | Blocked unless `hq_can_view_cost` |
| Tax filings | GSTR/TDS registers | Blocked unless `hq_can_view_tax` |
| Activity | login, export, approval logs | Auditors / HQ admin |

## 2. Data storage location

- Primary application database: PostgreSQL configured for Hyvision One (`hyvision_one` / deployment DB).
- File uploads: server `uploads/` or configured volume (`UPLOAD_PATH`).
- No automatic replication to a Korea-resident DB in this codebase; HQ users access India-hosted APIs over HTTPS.

## 3. Cross-border access structure

```
Korea HQ User (browser)
  → HTTPS → Hyvision One Frontend
  → HTTPS → Hyvision One API (`/api/hq/*`, `/api/mfg/*`, accounting APIs)
  → PostgreSQL (India / deployment region)
```

- Authentication: JWT session (`authenticateToken`).
- Authorization: `hq_role` + `hq_access_level` + fine flags (`hq_can_*`).
- Existing WebAuthn / MFA hooks remain available for stronger authentication.

## 4. HQ role matrix (application)

| Role (`hq_role`) | Typical access |
|------------------|----------------|
| `hq_admin` | Admin settings, users, privacy, full operational HQ |
| `hq_management` | KPI + reports + approve (if flagged) |
| `hq_finance` | Finance/tax KPIs, aging, budgets |
| `hq_production` | Production / BOM / WO KPIs |
| `hq_auditor` | Read + access logs |
| `hq_readonly` | KPI / reports read-only |

Access levels: `kpi_only` < `reports` < `txn_detail` < `attachments` < `export` < `approve` < `modify` < `admin`.

## 5. Retention & deletion (defaults — override in UI)

- Privacy setting `retention_days` default **365** (configurable).
- Soft-delete patterns for business docs (`is_active=false`); hard delete of master data is prohibited by product policy.
- Offboarding: set `users.status=inactive` immediately; session invalidated via `session_version`.

## 6. Audit logs

| Log | Purpose |
|-----|---------|
| `hq_access_logs` | HQ view / export / approve / login_hq |
| `hq_export_logs` | Excel/PDF export metadata |
| `login_logs` | Authentication events |
| `mfg_document_audit_logs` / voucher audits | Document mutations |

## 7. Sub-processors / external services (update per environment)

| Service | Use |
|---------|-----|
| Hosting (e.g. Railway / cloud VM) | App + DB hosting |
| GSP/ASP (future) | GST e-Invoice / e-Way (separate service layer) |
| SMTP / email (optional) | Notifications |
| Redis (optional) | Cache |

## 8. Operator checklist before go-live

1. Assign `hq_role` / flags only to authorized Korea HQ staff.  
2. Confirm FX source (replace `manual_seed` placeholders).  
3. Configure approval thresholds in `hq_approval_policies`.  
4. Complete `/hq/privacy` purpose, retention, legal basis with counsel.  
5. Enable HTTPS only; restrict admin IPs if required by policy.  
6. Test: readonly cannot approve; cost-masked user cannot see BOM unit costs; company scope isolation.
