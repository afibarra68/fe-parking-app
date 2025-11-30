export interface MenuItem {
  label: string;
  icon?: string;
  routerLink?: string;
  items?: MenuItem[];
  command?: () => void;
  visible?: boolean;
  badge?: string;
  badgeClass?: string;
}

