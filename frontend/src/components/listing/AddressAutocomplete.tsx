import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  validateAddress, 
  getPlaceAutocomplete, 
  getPlaceDetails,
  isGoogleMapsConfigured,
  type ValidatedAddress,
  type PlaceAutocompleteResult 
} from '@/lib/googleMaps';
import { MapPin, Check, AlertCircle, Loader2, Navigation } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onAddressValidated?: (validated: ValidatedAddress) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  countryRestriction?: string | string[];
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressValidated,
  label = 'Address',
  placeholder = 'Enter property address',
  required = false,
  disabled = false,
  countryRestriction = 'us',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [validatedData, setValidatedData] = useState<ValidatedAddress | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const isConfigured = isGoogleMapsConfigured();

  useEffect(() => {
    if (!value || value.length < 3 || !isConfigured) {
      setSuggestions([]);
      return;
    }

    // Debounce autocomplete requests
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      const results = await getPlaceAutocomplete(
        value,
        ['address'],
        countryRestriction ? { country: countryRestriction } : undefined
      );
      setSuggestions(results);
      setShowSuggestions(true);
      setIsLoading(false);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value, isConfigured, countryRestriction]);

  const handleSelectSuggestion = async (suggestion: PlaceAutocompleteResult) => {
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);

    // Get full place details
    setIsValidating(true);
    const details = await getPlaceDetails(suggestion.placeId);
    setIsValidating(false);

    if (details && details.isValid) {
      setValidationStatus('valid');
      setValidatedData(details);
      onAddressValidated?.(details);
    } else {
      setValidationStatus('invalid');
    }
  };

  const handleValidateAddress = async () => {
    if (!value || !isConfigured) return;

    setIsValidating(true);
    const result = await validateAddress(value);
    setIsValidating(false);

    if (result.isValid) {
      setValidationStatus('valid');
      setValidatedData(result);
      if (result.formattedAddress) {
        onChange(result.formattedAddress);
      }
      onAddressValidated?.(result);
    } else {
      setValidationStatus('invalid');
      setValidatedData(null);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        const result = await validateAddress(`${latitude},${longitude}`);
        setIsGettingLocation(false);

        if (result.isValid && result.formattedAddress) {
          onChange(result.formattedAddress);
          setValidationStatus('valid');
          setValidatedData(result);
          onAddressValidated?.(result);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        console.error('Geolocation error:', error);
        alert('Unable to get your location');
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setValidationStatus('idle');
    setValidatedData(null);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow click
    setTimeout(() => setShowSuggestions(false), 200);
  };

  if (!isConfigured) {
    return (
      <div>
        <Label htmlFor="address">{label}</Label>
        <Input
          id="address"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500 mt-1">
          Google Maps API not configured. Address validation disabled.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="address">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            ref={inputRef}
            id="address"
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            required={required}
            disabled={disabled || isValidating}
            className="pl-10 pr-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
          )}
          {validationStatus === 'valid' && (
            <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 h-4 w-4" />
          )}
          {validationStatus === 'invalid' && (
            <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 h-4 w-4" />
          )}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="absolute z-50 w-full mt-1 shadow-lg">
            <CardContent className="p-0">
              <div className="max-h-60 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1 mr-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{suggestion.mainText}</p>
                        <p className="text-xs text-gray-500">{suggestion.secondaryText}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleValidateAddress}
          disabled={!value || isValidating || disabled}
        >
          {isValidating ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Check className="h-3 w-3 mr-1" />
              Validate Address
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation || disabled}
        >
          {isGettingLocation ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Getting Location...
            </>
          ) : (
            <>
              <Navigation className="h-3 w-3 mr-1" />
              Use My Location
            </>
          )}
        </Button>
      </div>

      {/* Validation Status */}
      {validationStatus === 'valid' && validatedData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start">
            <Check className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Address Validated</p>
              <p className="text-xs text-green-700 mt-1">
                {validatedData.formattedAddress}
              </p>
              {validatedData.coordinates && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    Lat: {validatedData.coordinates.lat.toFixed(6)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Lng: {validatedData.coordinates.lng.toFixed(6)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {validationStatus === 'invalid' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">Invalid Address</p>
              <p className="text-xs text-red-700 mt-1">
                Please check the address and try again.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}