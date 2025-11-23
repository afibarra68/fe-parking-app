export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  routerLink?: string;
  children?: MenuItem[];
  visible?: boolean;
  badge?: string;
  badgeClass?: string;
}

