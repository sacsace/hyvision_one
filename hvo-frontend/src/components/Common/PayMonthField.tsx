import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { formatPayMonthLabel } from '../../utils/payMonth';

type PayMonthFieldProps = Omit<TextFieldProps, 'type' | 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  max?: string;
};

/**
 * `input[type=month]`는 OS/브라우저 로케일로 표시되어 앱 언어와 어긋날 수 있음.
 * 표시 문구는 i18n 언어로 맞추고, 실제 선택은 숨긴 month input으로 처리한다.
 */
const PayMonthField: React.FC<PayMonthFieldProps> = ({
  value,
  onChange,
  max,
  disabled,
  onClick,
  InputProps,
  inputProps,
  sx,
  ...rest
}) => {
  const { i18n } = useTranslation();
  const monthInputRef = useRef<HTMLInputElement>(null);
  const display = formatPayMonthLabel(value, i18n.language);

  const openPicker = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (disabled) return;
    e?.preventDefault?.();
    const input = monthInputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
        input.click();
      }
    } catch {
      input.focus();
      input.click();
    }
  };

  return (
    <Box sx={{ position: 'relative', width: rest.fullWidth ? '100%' : undefined }}>
      <TextField
        {...rest}
        disabled={disabled}
        value={display}
        onClick={(e) => {
          onClick?.(e);
          openPicker(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') openPicker(e);
        }}
        inputProps={{
          ...inputProps,
          readOnly: true,
          'aria-label': rest.label ? undefined : 'Pay month',
        }}
        InputProps={{
          ...InputProps,
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: 0.25 }}>
              <CalendarMonthOutlinedIcon
                sx={{ fontSize: '1.125rem', color: 'text.secondary', pointerEvents: 'none' }}
              />
              {InputProps?.endAdornment}
            </InputAdornment>
          ),
        }}
        sx={{
          ...sx,
          cursor: disabled ? undefined : 'pointer',
          '& .MuiInputBase-input': { cursor: disabled ? undefined : 'pointer' },
        }}
      />
      <input
        ref={monthInputRef}
        type="month"
        value={value || ''}
        max={max}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          border: 0,
          padding: 0,
          margin: 0,
        }}
      />
    </Box>
  );
};

export default PayMonthField;
