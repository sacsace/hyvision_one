import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { isSingleCompanyMode } from '../config/singleCompany';

export type AccountingCompany = { id: number; name: string };

/** 회사별 장부·전표 스코프 (단일회사 모드에서는 전환 UI 없음) */
export const useAccountingCompany = () => {
  const { user } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const canSelectCompany =
    !isSingleCompanyMode() && (user?.role === 'root' || user?.role === 'audit');
  const [companies, setCompanies] = useState<AccountingCompany[]>([]);

  const urlCompanyId = searchParams.get('company_id');
  const parsedUrlCompanyId =
    urlCompanyId && Number(urlCompanyId) > 0 ? Number(urlCompanyId) : undefined;

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>(
    user?.company_id ?? ''
  );

  const effectiveCompanyId = canSelectCompany
    ? selectedCompanyId || user?.company_id || undefined
    : user?.company_id || undefined;

  const selectedCompanyName = useMemo(() => {
    if (!effectiveCompanyId) return '';
    return companies.find((c) => c.id === effectiveCompanyId)?.name || `Company ${effectiveCompanyId}`;
  }, [companies, effectiveCompanyId]);

  const companyQuery = useMemo(
    () => (effectiveCompanyId ? { company_id: effectiveCompanyId } : undefined),
    [effectiveCompanyId]
  );

  const loadCompanies = useCallback(async () => {
    try {
      const { api } = await import('../services/api');
      const response = await api.get('/companies');
      if (response.data.success) {
        setCompanies(response.data.data || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadUserCompany = useCallback(async () => {
    if (!user?.company_id) return;
    try {
      const { api } = await import('../services/api');
      const response = await api.get(`/companies/${user.company_id}`);
      if (response.data.success && response.data.data) {
        setCompanies([response.data.data]);
      }
    } catch {
      /* ignore */
    }
  }, [user?.company_id]);

  useEffect(() => {
    if (canSelectCompany) {
      loadCompanies();
    } else {
      loadUserCompany();
    }
  }, [canSelectCompany, loadCompanies, loadUserCompany]);

  useEffect(() => {
    if (parsedUrlCompanyId && canSelectCompany) {
      setSelectedCompanyId(parsedUrlCompanyId);
      return;
    }
    if (user?.company_id) {
      setSelectedCompanyId(user.company_id);
    }
  }, [parsedUrlCompanyId, canSelectCompany, user?.company_id]);

  const changeCompany = useCallback(
    (companyId: number) => {
      if (!canSelectCompany) return;
      setSelectedCompanyId(companyId);
      const next = new URLSearchParams(searchParams);
      next.set('company_id', String(companyId));
      setSearchParams(next, { replace: true });
    },
    [canSelectCompany, searchParams, setSearchParams]
  );

  return {
    canSelectCompany,
    companies,
    selectedCompanyId,
    effectiveCompanyId,
    selectedCompanyName,
    companyQuery,
    changeCompany,
  };
};
