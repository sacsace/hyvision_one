import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

/**
 * Hyvision One 공통 모달(확인·입력) 시각 토큰.
 *
 * - 신규 **확인** UI: `ConfirmDialog` + `useConfirmDialog` 만 사용합니다.
 * - 신규 **문자 입력** UI: `PromptDialog` + `usePromptDialog` 를 사용합니다.
 * - 페이지/기능별로 `Dialog` + 커스텀 `PaperProps` 로 확인창을 새로 만들지 마세요. (디자인 드리프트 방지)
 */

export const HVO_CONFIRM_DIALOG_MAX_WIDTH = 'xs' as const;
export const HVO_PROMPT_DIALOG_MAX_WIDTH = 'sm' as const;

export function getHvoDialogPaperSx(theme: Theme): SxProps<Theme> {
  return {
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.background.paper
  };
}

export function getHvoDialogTitleRowSx(theme: Theme): SxProps<Theme> {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    py: theme.spacing(2),
    px: theme.spacing(2.5),
    bgcolor: theme.palette.background.paper,
    borderBottom: '1px solid',
    borderColor: 'divider'
  };
}

export function getHvoDialogIconBoxSx(
  theme: Theme,
  accent: string,
  options: { tone: 'brand' | 'danger' }
): SxProps<Theme> {
  return {
    width: 36,
    height: 36,
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: accent,
    bgcolor:
      options.tone === 'danger' ? alpha(accent, 0.14) : alpha(theme.palette.primary.main, 0.12)
  };
}

export function getHvoDialogMessageContentSx(theme: Theme): SxProps<Theme> {
  return {
    px: theme.spacing(2.5),
    pt: theme.spacing(2.5),
    pb: theme.spacing(1)
  };
}

/** PromptDialog 본문(설명 + 입력) */
export function getHvoDialogPromptContentSx(theme: Theme): SxProps<Theme> {
  return {
    px: theme.spacing(2.5),
    pt: theme.spacing(2),
    pb: theme.spacing(1)
  };
}

export function getHvoDialogActionsSx(theme: Theme): SxProps<Theme> {
  return {
    px: theme.spacing(2.5),
    pb: theme.spacing(2.5),
    pt: theme.spacing(1),
    gap: theme.spacing(1.5),
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  };
}

/** 취소 — 중립 아웃라인 */
export function getHvoDialogCancelButtonSx(theme: Theme): SxProps<Theme> {
  return {
    borderRadius: '6px',
    textTransform: 'none',
    px: 2.5,
    py: 0.75,
    minWidth: 88,
    borderColor: theme.palette.divider,
    color: theme.palette.text.secondary,
    bgcolor: 'transparent',
    '&:hover': {
      borderColor: theme.palette.text.disabled,
      bgcolor: theme.palette.action.hover
    }
  };
}

/** 확인(primary) / danger 는 MUI `color`에 맡김 */
export function getHvoDialogPrimaryConfirmButtonSx(): SxProps<Theme> {
  return {
    borderRadius: '6px',
    textTransform: 'none',
    px: 2.5,
    py: 0.75,
    minWidth: 88,
    boxShadow: 'none'
  };
}

export function getHvoDialogDangerConfirmButtonSx(): SxProps<Theme> {
  return {
    borderRadius: '6px',
    textTransform: 'none',
    px: 2.5,
    py: 0.75,
    minWidth: 88,
    boxShadow: 'none'
  };
}
