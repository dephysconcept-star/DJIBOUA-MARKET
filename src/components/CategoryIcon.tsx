import React from 'react';
import {
  Smartphone,
  Laptop,
  Tv,
  Refrigerator,
  Armchair,
  Shirt,
  Footprints,
  Sparkles,
  Tractor,
  Bike,
  Wrench,
  Home,
  Building2,
  Wheat,
  Briefcase,
  Cpu,
  Gamepad2,
  Package,
  LucideIcon
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  Smartphone,
  Laptop,
  Tv,
  Refrigerator,
  Armchair,
  Shirt,
  Footprints,
  Sparkles,
  Tractor,
  Bike,
  Wrench,
  Home,
  Building2,
  Wheat,
  Briefcase,
  Cpu,
  Gamepad2,
  Package
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5' }) => {
  const IconComponent = iconMap[name] || Package;
  return <IconComponent className={className} />;
};
