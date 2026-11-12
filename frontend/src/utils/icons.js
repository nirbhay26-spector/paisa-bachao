// Map category icon names to lucide-react components
import {
  UtensilsCrossed, Coffee, Bus, ShoppingBag, GraduationCap, Gamepad2,
  Smartphone, Heart, Users, RefreshCw, PiggyBank, MoreHorizontal,
  Banknote, CreditCard, Wallet, Circle, Home, BarChart3, User, Plus,
  ArrowLeft, Search, Filter, X, Check, ChevronRight, ChevronDown,
  Calendar, Paperclip, Camera, Send, MessageCircle, Target, Award,
  TrendingUp, TrendingDown, AlertTriangle, Bell, Settings, Moon, Sun,
  Monitor, Download, Upload, Trash2, Edit3, LogOut, Shield, ArrowUpDown,
  ListFilter, Repeat
} from 'lucide-react';

const iconMap = {
  UtensilsCrossed, Coffee, Bus, ShoppingBag, GraduationCap, Gamepad2,
  Smartphone, Heart, Users, RefreshCw, PiggyBank, MoreHorizontal,
  Banknote, CreditCard, Wallet, Circle, Home, BarChart3, User, Plus,
  ArrowLeft, Search, Filter, X, Check, ChevronRight, ChevronDown,
  Calendar, Paperclip, Camera, Send, MessageCircle, Target, Award,
  TrendingUp, TrendingDown, AlertTriangle, Bell, Settings, Moon, Sun,
  Monitor, Download, Upload, Trash2, Edit3, LogOut, Shield, ArrowUpDown,
  ListFilter, Repeat
};

export function getIcon(name) {
  return iconMap[name] || Circle;
}

export default iconMap;

