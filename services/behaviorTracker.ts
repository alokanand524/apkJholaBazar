import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserBehavior {
  viewedProducts: string[];
  searchHistory: string[];
  categoryPreferences: { [key: string]: number };
  lastVisitedCategory: string;
  favoriteProducts: string[];
  cartAbandonments: number;
  sessionStartTime: number;
}

class BehaviorTracker {
  private static instance: BehaviorTracker;
  private behavior: UserBehavior = {
    viewedProducts: [],
    searchHistory: [],
    categoryPreferences: {},
    lastVisitedCategory: '',
    favoriteProducts: [],
    cartAbandonments: 0,
    sessionStartTime: Date.now()
  };

  static getInstance(): BehaviorTracker {
    if (!BehaviorTracker.instance) {
      BehaviorTracker.instance = new BehaviorTracker();
    }
    return BehaviorTracker.instance;
  }

  async init() {
    try {
      const stored = await AsyncStorage.getItem('userBehavior');
      if (stored) {
        this.behavior = { ...this.behavior, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load behavior data:', error);
    }
  }

  private async save() {
    try {
      await AsyncStorage.setItem('userBehavior', JSON.stringify(this.behavior));
    } catch (error) {
      console.error('Failed to save behavior data:', error);
    }
  }

  trackProductView(productId: string, category: string) {
    if (!this.behavior.viewedProducts.includes(productId)) {
      this.behavior.viewedProducts.unshift(productId);
      this.behavior.viewedProducts = this.behavior.viewedProducts.slice(0, 50);
    }
    
    this.behavior.categoryPreferences[category] = (this.behavior.categoryPreferences[category] || 0) + 1;
    this.save();
  }

  trackSearch(query: string) {
    if (query.trim() && !this.behavior.searchHistory.includes(query)) {
      this.behavior.searchHistory.unshift(query);
      this.behavior.searchHistory = this.behavior.searchHistory.slice(0, 20);
      this.save();
    }
  }

  trackCategoryVisit(category: string) {
    this.behavior.lastVisitedCategory = category;
    this.behavior.categoryPreferences[category] = (this.behavior.categoryPreferences[category] || 0) + 1;
    this.save();
  }

  getRecommendedCategories(): string[] {
    return Object.entries(this.behavior.categoryPreferences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);
  }

  getSearchSuggestions(): string[] {
    return this.behavior.searchHistory.slice(0, 5);
  }

  getViewedProducts(): string[] {
    return this.behavior.viewedProducts.slice(0, 10);
  }

  getLastVisitedCategory(): string {
    return this.behavior.lastVisitedCategory;
  }
}

export const behaviorTracker = BehaviorTracker.getInstance();