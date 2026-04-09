import { useNavigate } from 'react-router-dom';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import { PropertyCard } from '@/components/property/PropertyCard';

export default function FeaturedProperties() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {FEATURED_PROPERTIES.map((property) => (
        <PropertyCard
          key={property.id}
          property={{
            id: property.id,
            title: property.title,
            address: property.address,
            city: property.city,
            state: property.state,
            price: property.rent,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            squareFeet: property.squareFeet ?? undefined,
            images: property.images,
            priceChange: property.priceChange,
            rating: property.rating,
            daysOnMarket: property.daysOnMarket,
            photoCount: property.photoCount,
          }}
          onClick={() => navigate(`/properties/${property.id}`, { state: { property } })}
        />
      ))}
    </div>
  );
}
