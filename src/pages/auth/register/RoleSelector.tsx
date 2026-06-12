import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Role = 'tenant' | 'landlord';

interface RoleSelectorProps {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  isConnected?: boolean;
}

export function RoleSelector({ value, onChange, disabled, isConnected }: RoleSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">I am a</Label>
      <RadioGroup
        value={value}
        onValueChange={(v: Role) => onChange(v)}
        className="flex gap-4"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2 flex-1 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
          <RadioGroupItem value="tenant" id="tenant" />
          <Label htmlFor="tenant" className="cursor-pointer font-normal w-full">Tenant</Label>
        </div>
        <div className="flex items-center space-x-2 flex-1 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
          <RadioGroupItem value="landlord" id="landlord" />
          <Label htmlFor="landlord" className="cursor-pointer font-normal w-full">Landlord</Label>
        </div>
      </RadioGroup>
      {isConnected && (
        <p className="text-xs text-muted-foreground">
          Role is set during first connection. To change, disconnect and reconnect.
        </p>
      )}
    </div>
  );
}
