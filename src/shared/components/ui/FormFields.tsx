import { TextField, FormControl, InputLabel, Select, FormHelperText } from '@mui/material';
import type { TextFieldProps, SelectProps, SxProps } from '@mui/material';
import type { ReactNode } from 'react';

// Shared constant — import this alongside FormSelect for MenuItem sizing
export const ITEM_SX = { fontSize: '0.8125rem' } as const;

const FIELD_SX = { bgcolor: '#fff', borderRadius: 1 } as const;
const LABEL_SX = { fontSize: '0.8125rem' } as const;

/** TextField with consistent 13px sizing and white bg baked in */
export function FormTextField({ InputLabelProps, inputProps, sx, ...props }: TextFieldProps) {
  return (
    <TextField
      size="small"
      InputLabelProps={{ sx: LABEL_SX, ...InputLabelProps }}
      inputProps={{ style: { fontSize: '0.8125rem' }, ...inputProps }}
      sx={{ ...FIELD_SX, ...sx }}
      {...props}
    />
  );
}

interface FormSelectProps extends Omit<SelectProps, 'label'> {
  label: string;
  helperText?: string;
  containerSx?: SxProps;
  children: ReactNode;
}

/** FormControl + InputLabel + Select with consistent 13px sizing */
export function FormSelect({ label, helperText, error, containerSx, children, ...selectProps }: FormSelectProps) {
  return (
    <FormControl size="small" error={error} sx={{ ...FIELD_SX, ...containerSx }}>
      <InputLabel sx={LABEL_SX}>{label}</InputLabel>
      <Select label={label} sx={{ fontSize: '0.8125rem' }} {...selectProps}>
        {children}
      </Select>
      {helperText && (
        <FormHelperText sx={{ fontSize: '0.7rem' }}>{helperText}</FormHelperText>
      )}
    </FormControl>
  );
}
