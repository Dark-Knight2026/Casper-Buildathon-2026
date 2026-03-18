interface PeriodOption<T> {
  label: string;
  value: T;
}

interface PeriodSelectorProps<T> {
  options: PeriodOption<T>[];
  selected: T;
  onChange: (value: T) => void;
}

export function PeriodSelector<T>({ options, selected, onChange }: PeriodSelectorProps<T>) {
  return (
    <div className="flex gap-1">
      {options.map((option) => (
        <button
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
            selected === option.value
              ? 'bg-[hsl(var(--ico-brand-primary))] text-white'
              : 'text-[hsl(var(--ico-text-secondary))] hover:text-[hsl(var(--ico-text-primary))]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default PeriodSelector;
