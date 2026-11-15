import { forwardRef, type ReactNode } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}
interface SelectProps {
  id: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

// Prefixing values also supports an explicit "all" option with value="".
const encodeValue = (value: string) => `option:${value}`;
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    id,
    name,
    value,
    onValueChange,
    onBlur,
    options,
    placeholder = 'Selecione',
    disabled,
    required,
    invalid,
    describedBy,
  },
  ref,
) {
  const selected = options.find((option) => option.value === value);
  return (
    <SelectPrimitive.Root
      name={name}
      value={selected ? encodeValue(value) : ''}
      onValueChange={(next) => onValueChange(next.slice('option:'.length))}
      disabled={disabled}
      required={required}
    >
      <SelectPrimitive.Trigger
        ref={ref}
        id={id}
        className="select-trigger"
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <span className="select-value">
          {selected?.icon && (
            <span className="select-option-icon" aria-hidden="true">
              {selected.icon}
            </span>
          )}
          <span className="select-value-text">
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
        </span>
        <SelectPrimitive.Icon className="select-chevron">
          <ChevronDown size={18} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="select-content"
          position="popper"
          sideOffset={6}
          align="start"
          collisionPadding={12}
        >
          <SelectPrimitive.ScrollUpButton className="select-scroll-button">
            <ChevronUp size={16} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                className="select-option"
                value={encodeValue(option.value)}
                disabled={option.disabled}
                textValue={option.label}
              >
                {option.icon && (
                  <span className="select-option-icon" aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="select-check">
                  <Check size={17} strokeWidth={2} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="select-scroll-button">
            <ChevronDown size={16} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
});
