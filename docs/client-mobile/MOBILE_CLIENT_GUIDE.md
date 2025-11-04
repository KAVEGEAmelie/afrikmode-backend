# 📱 GUIDE CLIENT MOBILE - AFRIKMODE

## 🎯 VUE D'ENSEMBLE

Ce guide détaille l'intégration de l'API AfrikMode pour les applications mobiles (iOS/Android) avec React Native, Flutter, ou développement natif. L'API est optimisée pour les performances mobiles avec cache, synchronisation hors ligne et notifications push.

### 🚀 **Fonctionnalités Mobile**
- **Authentification** avec biométrie (Touch/Face ID)
- **Catalogue produits** avec recherche avancée et filtres
- **Panier & commandes** avec paiement mobile
- **Deep Links** pour navigation directe
- **Notifications Push** personnalisées
- **Mode Hors Ligne** avec synchronisation
- **Géolocalisation** pour livraison
- **PWA** pour expérience web native

---

## 🔧 CONFIGURATION INITIALE

### 📦 **Installation & Setup**

#### **React Native**
```bash
npm install @afrikmode/mobile-sdk axios react-native-async-storage
npm install @react-native-firebase/app @react-native-firebase/messaging
npm install react-native-keychain react-native-touch-id
```

#### **Flutter**
```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^0.13.5
  shared_preferences: ^2.0.15
  firebase_messaging: ^14.0.0
  local_auth: ^2.1.6
  geolocator: ^9.0.2
```

### ⚙️ **Configuration API**

#### **React Native - API Client**
```typescript
// services/ApiClient.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class AfrikModeApiClient {
  private api: AxiosInstance;
  private baseURL = 'https://api.afrikmode.com'; // Votre URL API

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Platform': 'mobile',
        'X-App-Version': '1.0.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor pour ajouter le token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Ajouter device info
        config.headers['X-Device-ID'] = await this.getDeviceId();
        config.headers['X-Platform-Version'] = await this.getPlatformVersion();
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor pour gestion erreurs
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.handleTokenExpired();
        }
        return Promise.reject(error);
      }
    );
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = Math.random().toString(36).substr(2, 9);
      await AsyncStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private async handleTokenExpired() {
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
    // Navigate to login screen
  }

  // Methods publiques
  async get(url: string, config?: AxiosRequestConfig) {
    return this.api.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.api.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.api.put(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    return this.api.delete(url, config);
  }
}

export const apiClient = new AfrikModeApiClient();
```

#### **Flutter - API Client**
```dart
// services/api_client.dart
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';

class AfrikModeApiClient {
  late Dio _dio;
  static const String baseUrl = 'https://api.afrikmode.com';

  AfrikModeApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: 10000,
      receiveTimeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Platform': 'mobile-flutter',
        'X-App-Version': '1.0.0',
      },
    ));

    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('auth_token');
        
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }

        options.headers['X-Device-ID'] = await _getDeviceId();
        options.headers['X-Platform-Version'] = await _getPlatformVersion();
        
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          await _handleTokenExpired();
        }
        handler.next(error);
      },
    ));
  }

  Future<String> _getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? deviceId = prefs.getString('device_id');
    
    if (deviceId == null) {
      final deviceInfo = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.androidId;
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor;
      }
      
      await prefs.setString('device_id', deviceId!);
    }
    
    return deviceId;
  }

  Future<void> _handleTokenExpired() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    // Navigate to login
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) {
    return _dio.put(path, data: data);
  }

  Future<Response> delete(String path) {
    return _dio.delete(path);
  }
}
```

---

## 🔐 AUTHENTIFICATION MOBILE

### 📱 **Authentification avec Biométrie**

#### **React Native - Auth Service**
```typescript
// services/AuthService.ts
import TouchID from 'react-native-touch-id';
import Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
  expires_in: number;
}

export class AuthService {
  private apiClient = new AfrikModeApiClient();

  // Connexion classique
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post('/api/auth/login', {
        email,
        password,
        device_type: Platform.OS,
        remember_me: true
      });

      await this.saveAuthData(response.data);
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Configuration biométrie
  async enableBiometricAuth(password: string): Promise<boolean> {
    try {
      const biometryType = await TouchID.isSupported();
      
      if (!biometryType) {
        throw new Error('Biométrie non supportée sur cet appareil');
      }

      // Sauvegarder les credentials de façon sécurisée
      await Keychain.setInternetCredentials(
        'afrikmode_auth',
        await this.getCurrentUser().email,
        password
      );

      await AsyncStorage.setItem('biometric_enabled', 'true');
      await AsyncStorage.setItem('biometric_type', biometryType);

      return true;
    } catch (error) {
      console.error('Erreur activation biométrie:', error);
      return false;
    }
  }

  // Connexion biométrique
  async loginWithBiometric(): Promise<AuthResponse> {
    try {
      const biometricEnabled = await AsyncStorage.getItem('biometric_enabled');
      if (biometricEnabled !== 'true') {
        throw new Error('Biométrie non activée');
      }

      // Authentification biométrique
      await TouchID.authenticate('Connectez-vous avec votre empreinte', {
        title: 'Authentification AfrikMode',
        subtitle: 'Utilisez votre empreinte digitale pour vous connecter',
        description: 'Placez votre doigt sur le capteur',
        fallbackLabel: 'Utiliser le code PIN',
        cancelLabel: 'Annuler'
      });

      // Récupérer les credentials sauvegardés
      const credentials = await Keychain.getInternetCredentials('afrikmode_auth');
      if (!credentials) {
        throw new Error('Credentials non trouvés');
      }

      // Connexion avec les credentials
      return await this.login(credentials.username, credentials.password);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Sauvegarder données auth
  private async saveAuthData(authData: AuthResponse) {
    await AsyncStorage.multiSet([
      ['auth_token', authData.token],
      ['refresh_token', authData.refresh_token],
      ['user_data', JSON.stringify(authData.user)],
      ['token_expires', (Date.now() + authData.expires_in * 1000).toString()]
    ]);
  }

  // Déconnexion
  async logout(): Promise<void> {
    try {
      await this.apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Erreur logout API:', error);
    } finally {
      await AsyncStorage.multiRemove([
        'auth_token', 'refresh_token', 'user_data', 'token_expires'
      ]);
      await Keychain.resetInternetCredentials('afrikmode_auth');
    }
  }

  // Vérifier si connecté
  async isLoggedIn(): Promise<boolean> {
    const token = await AsyncStorage.getItem('auth_token');
    const expiresStr = await AsyncStorage.getItem('token_expires');
    
    if (!token || !expiresStr) return false;
    
    const expires = parseInt(expiresStr);
    return Date.now() < expires;
  }

  // Obtenir utilisateur courant
  async getCurrentUser(): Promise<User | null> {
    const userDataStr = await AsyncStorage.getItem('user_data');
    return userDataStr ? JSON.parse(userDataStr) : null;
  }

  private handleAuthError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    return new Error('Erreur d\'authentification');
  }
}
```

### 🔄 **Gestion Token Auto-Refresh**
```typescript
// services/TokenManager.ts
export class TokenManager {
  private refreshPromise: Promise<string> | null = null;

  async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _performRefresh(): Promise<string> {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.apiClient.post('/api/auth/refresh', {
      refresh_token: refreshToken
    });

    const { token, expires_in } = response.data;
    
    await AsyncStorage.multiSet([
      ['auth_token', token],
      ['token_expires', (Date.now() + expires_in * 1000).toString()]
    ]);

    return token;
  }
}
```

---

## 🛒 CATALOGUE & PRODUITS

### 📋 **Service Produits Mobile**

#### **React Native**
```typescript
// services/ProductService.ts
interface ProductFilters {
  category_id?: string;
  store_id?: string;
  price_min?: number;
  price_max?: number;
  search?: string;
  sort_by?: 'name' | 'price' | 'rating' | 'created_at';
  sort_order?: 'asc' | 'desc';
  featured?: boolean;
  in_stock?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number; // km
  };
}

export class ProductService {
  private apiClient = new AfrikModeApiClient();
  
  // Liste produits avec cache
  async getProducts(
    page: number = 1, 
    filters: ProductFilters = {},
    useCache: boolean = true
  ): Promise<ProductListResponse> {
    const cacheKey = `products_${JSON.stringify({page, filters})}`;
    
    if (useCache) {
      const cached = await this.getCachedData(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.apiClient.get('/api/products', {
        params: {
          page,
          limit: 20,
          ...filters,
          mobile: true,
          include_store: true,
          include_images: true
        }
      });

      const data = response.data;
      
      // Cache pour 5 minutes
      await this.setCachedData(cacheKey, data, 5 * 60 * 1000);
      
      return data;
    } catch (error) {
      // Retourner cache si erreur réseau
      const cached = await this.getCachedData(cacheKey);
      if (cached) {
        console.warn('Using cached data due to network error');
        return cached;
      }
      throw error;
    }
  }

  // Détail produit
  async getProduct(id: string): Promise<Product> {
    const cacheKey = `product_${id}`;
    
    const cached = await this.getCachedData(cacheKey);
    if (cached) return cached;

    const response = await this.apiClient.get(`/api/products/${id}`, {
      params: {
        include_store: true,
        include_reviews: true,
        include_related: true,
        mobile: true
      }
    });

    const product = response.data;
    
    // Cache produit pour 10 minutes
    await this.setCachedData(cacheKey, product, 10 * 60 * 1000);
    
    // Enregistrer vue
    this.trackProductView(id);
    
    return product;
  }

  // Recherche produits avec suggestions
  async searchProducts(
    query: string,
    filters: ProductFilters = {}
  ): Promise<SearchResponse> {
    if (query.length < 2) {
      return { products: [], suggestions: [], total: 0 };
    }

    const response = await this.apiClient.get('/api/products/search', {
      params: {
        q: query,
        ...filters,
        mobile: true,
        include_suggestions: true,
        autocomplete: true
      }
    });

    // Sauvegarder recherche récente
    await this.saveRecentSearch(query);

    return response.data;
  }

  // Produits favoris
  async getFavorites(): Promise<Product[]> {
    const response = await this.apiClient.get('/api/users/favorites');
    return response.data.products;
  }

  async toggleFavorite(productId: string): Promise<boolean> {
    const response = await this.apiClient.post(`/api/products/${productId}/favorite`);
    return response.data.is_favorite;
  }

  // Recherches récentes
  private async saveRecentSearch(query: string) {
    const recentSearches = await this.getRecentSearches();
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    await AsyncStorage.setItem('recent_searches', JSON.stringify(updated));
  }

  async getRecentSearches(): Promise<string[]> {
    const data = await AsyncStorage.getItem('recent_searches');
    return data ? JSON.parse(data) : [];
  }

  // Tracking
  private async trackProductView(productId: string) {
    // Tracking asynchrone sans bloquer l'UI
    setTimeout(async () => {
      try {
        await this.apiClient.post(`/api/products/${productId}/view`);
      } catch (error) {
        console.warn('Failed to track product view:', error);
      }
    }, 100);
  }

  // Cache management
  private async getCachedData(key: string): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const { data, expires } = JSON.parse(cached);
      if (Date.now() > expires) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  private async setCachedData(key: string, data: any, ttl: number) {
    try {
      const cacheData = {
        data,
        expires: Date.now() + ttl
      };
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }
}
```

### 🛍️ **Composant Liste Produits**
```typescript
// components/ProductList.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  FlatList, View, Text, TouchableOpacity, Image,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { ProductService } from '../services/ProductService';

interface Props {
  filters?: ProductFilters;
  onProductPress: (product: Product) => void;
}

export const ProductList: React.FC<Props> = ({ filters = {}, onProductPress }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const productService = useMemo(() => new ProductService(), []);

  useEffect(() => {
    loadProducts(1, true);
  }, [filters]);

  const loadProducts = async (pageNum: number, replace: boolean = false) => {
    if (loading && !replace) return;

    setLoading(true);
    
    try {
      const response = await productService.getProducts(pageNum, filters);
      
      if (replace) {
        setProducts(response.products);
      } else {
        setProducts(prev => [...prev, ...response.products]);
      }
      
      setPage(pageNum);
      setHasMore(response.products.length === 20); // Assuming 20 per page
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les produits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(1, true);
  };

  const onEndReached = () => {
    if (hasMore && !loading) {
      loadProducts(page + 1);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onProductPress(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.main_image }} style={styles.productImage} />
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        
        <Text style={styles.storeName}>
          {item.store?.name}
        </Text>
        
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            {item.price}€
          </Text>
          
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>⭐ {item.average_rating}</Text>
            <Text style={styles.reviewCount}>({item.reviews_count})</Text>
          </View>
        </View>
        
        {item.discount_percentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{item.discount_percentage}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Aucun produit trouvé</Text>
    </View>
  );

  return (
    <FlatList
      data={products}
      renderItem={renderProduct}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={!loading ? renderEmpty : null}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 0.48,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  storeName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    marginRight: 2,
  },
  reviewCount: {
    fontSize: 10,
    color: '#666',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
```

---

## 🛒 PANIER & COMMANDES

### 🛍️ **Service Panier Mobile**
```typescript
// services/CartService.ts
interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selected_variant?: ProductVariant;
  unit_price: number;
  total_price: number;
}

interface Cart {
  id: string;
  items: CartItem[];
  total_items: number;
  subtotal: number;
  shipping_cost: number;
  total: number;
  currency: string;
}

export class CartService {
  private apiClient = new AfrikModeApiClient();

  // Obtenir panier courant
  async getCart(): Promise<Cart> {
    try {
      const response = await this.apiClient.get('/api/cart');
      return response.data;
    } catch (error) {
      // Fallback sur panier local si non connecté
      return this.getLocalCart();
    }
  }

  // Ajouter au panier
  async addToCart(
    productId: string, 
    quantity: number = 1,
    variantId?: string
  ): Promise<Cart> {
    try {
      const response = await this.apiClient.post('/api/cart/add', {
        product_id: productId,
        quantity,
        variant_id: variantId
      });
      
      // Synchroniser avec local storage
      await this.syncLocalCart(response.data);
      
      return response.data;
    } catch (error) {
      // Ajouter localement si erreur réseau
      return this.addToLocalCart(productId, quantity, variantId);
    }
  }

  // Mettre à jour quantité
  async updateQuantity(itemId: string, quantity: number): Promise<Cart> {
    if (quantity <= 0) {
      return this.removeItem(itemId);
    }

    try {
      const response = await this.apiClient.put(`/api/cart/items/${itemId}`, {
        quantity
      });
      
      await this.syncLocalCart(response.data);
      return response.data;
    } catch (error) {
      return this.updateLocalCartQuantity(itemId, quantity);
    }
  }

  // Supprimer du panier
  async removeItem(itemId: string): Promise<Cart> {
    try {
      const response = await this.apiClient.delete(`/api/cart/items/${itemId}`);
      await this.syncLocalCart(response.data);
      return response.data;
    } catch (error) {
      return this.removeFromLocalCart(itemId);
    }
  }

  // Vider le panier
  async clearCart(): Promise<void> {
    try {
      await this.apiClient.delete('/api/cart');
    } catch (error) {
      console.warn('Failed to clear remote cart:', error);
    } finally {
      await AsyncStorage.removeItem('local_cart');
    }
  }

  // Synchronisation hors ligne
  private async syncLocalCart(cart: Cart) {
    await AsyncStorage.setItem('local_cart', JSON.stringify(cart));
  }

  private async getLocalCart(): Promise<Cart> {
    try {
      const localCart = await AsyncStorage.getItem('local_cart');
      return localCart ? JSON.parse(localCart) : this.getEmptyCart();
    } catch {
      return this.getEmptyCart();
    }
  }

  private async addToLocalCart(
    productId: string, 
    quantity: number, 
    variantId?: string
  ): Promise<Cart> {
    const cart = await this.getLocalCart();
    
    // Logique d'ajout local (simplifié)
    // En réalité, vous devriez récupérer les détails du produit
    
    await this.syncLocalCart(cart);
    return cart;
  }

  private getEmptyCart(): Cart {
    return {
      id: 'local',
      items: [],
      total_items: 0,
      subtotal: 0,
      shipping_cost: 0,
      total: 0,
      currency: 'EUR'
    };
  }

  // Calculer frais de livraison
  async calculateShipping(address: Address): Promise<ShippingOptions> {
    const response = await this.apiClient.post('/api/cart/shipping', {
      address
    });
    return response.data;
  }
}
```

### 📦 **Service Commandes**
```typescript
// services/OrderService.ts
interface CreateOrderData {
  shipping_address: Address;
  billing_address?: Address;
  payment_method: string;
  payment_provider: 'stripe' | 'paypal' | 'mobile_money';
  delivery_instructions?: string;
  use_points?: boolean;
}

export class OrderService {
  private apiClient = new AfrikModeApiClient();

  // Créer commande
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    const response = await this.apiClient.post('/api/orders', orderData);
    
    // Sauvegarder localement pour suivi
    await this.saveOrderLocally(response.data);
    
    return response.data;
  }

  // Mes commandes
  async getMyOrders(
    page: number = 1,
    status?: OrderStatus
  ): Promise<OrderListResponse> {
    const response = await this.apiClient.get('/api/orders', {
      params: {
        page,
        limit: 20,
        status,
        include_items: true
      }
    });
    
    return response.data;
  }

  // Détail commande
  async getOrder(orderId: string): Promise<Order> {
    const response = await this.apiClient.get(`/api/orders/${orderId}`);
    return response.data;
  }

  // Suivi commande
  async trackOrder(orderId: string): Promise<OrderTracking> {
    const response = await this.apiClient.get(`/api/orders/${orderId}/tracking`);
    return response.data;
  }

  // Annuler commande
  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const response = await this.apiClient.post(`/api/orders/${orderId}/cancel`, {
      reason
    });
    return response.data;
  }

  // Confirmer réception
  async confirmDelivery(orderId: string): Promise<Order> {
    const response = await this.apiClient.post(`/api/orders/${orderId}/confirm-delivery`);
    return response.data;
  }

  // Retourner produit
  async requestReturn(
    orderId: string, 
    itemId: string, 
    reason: string
  ): Promise<ReturnRequest> {
    const response = await this.apiClient.post(`/api/orders/${orderId}/return`, {
      item_id: itemId,
      reason
    });
    return response.data;
  }

  private async saveOrderLocally(order: Order) {
    try {
      const existingOrders = await this.getLocalOrders();
      const updated = [order, ...existingOrders.filter(o => o.id !== order.id)];
      await AsyncStorage.setItem('local_orders', JSON.stringify(updated.slice(0, 50)));
    } catch (error) {
      console.warn('Failed to save order locally:', error);
    }
  }

  private async getLocalOrders(): Promise<Order[]> {
    try {
      const orders = await AsyncStorage.getItem('local_orders');
      return orders ? JSON.parse(orders) : [];
    } catch {
      return [];
    }
  }
}
```

---

## 💳 PAIEMENTS MOBILES

### 💰 **Service Paiement**
```typescript
// services/PaymentService.ts
import { PaymentRequest, PaymentResponse } from '@stripe/stripe-react-native';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'mobile_money';
  provider: string;
  last_digits?: string;
  is_default: boolean;
  expires_at?: string;
}

export class PaymentService {
  private apiClient = new AfrikModeApiClient();

  // Initialiser paiement
  async initializePayment(
    orderId: string,
    paymentMethod: string
  ): Promise<PaymentIntent> {
    const response = await this.apiClient.post('/api/payments/initialize', {
      order_id: orderId,
      payment_method: paymentMethod,
      platform: Platform.OS,
      return_url: 'afrikmode://payment-success',
      cancel_url: 'afrikmode://payment-cancel'
    });
    
    return response.data;
  }

  // Apple Pay (iOS seulement)
  async payWithApplePay(amount: number, currency: string = 'EUR'): Promise<PaymentResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Pay non disponible sur Android');
    }

    try {
      // Configuration Apple Pay
      const paymentRequest: PaymentRequest = {
        merchantIdentifier: 'merchant.com.afrikmode.app',
        country: 'FR',
        currency: currency.toUpperCase(),
        paymentSummaryItems: [{
          label: 'AfrikMode',
          amount: amount.toFixed(2)
        }],
        merchantCapabilities: ['debit', 'credit'],
        supportedNetworks: ['visa', 'masterCard', 'amex']
      };

      const result = await ApplePay.requestPayment(paymentRequest);
      
      if (result.transactionIdentifier) {
        return {
          success: true,
          transactionId: result.transactionIdentifier,
          paymentData: result.paymentData
        };
      }
      
      throw new Error('Payment failed');
    } catch (error) {
      throw new Error(`Apple Pay error: ${error.message}`);
    }
  }

  // Google Pay (Android seulement)
  async payWithGooglePay(amount: number, currency: string = 'EUR'): Promise<PaymentResult> {
    if (Platform.OS !== 'android') {
      throw new Error('Google Pay non disponible sur iOS');
    }

    try {
      const paymentRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'stripe',
              gatewayMerchantId: 'your_stripe_merchant_id'
            }
          }
        }],
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: amount.toFixed(2),
          currencyCode: currency.toUpperCase(),
          countryCode: 'FR'
        },
        merchantInfo: {
          merchantName: 'AfrikMode'
        }
      };

      const result = await GooglePay.requestPayment(paymentRequest);
      
      return {
        success: true,
        paymentData: result
      };
    } catch (error) {
      throw new Error(`Google Pay error: ${error.message}`);
    }
  }

  // Paiement Mobile Money (Afrique)
  async payWithMobileMoney(
    phoneNumber: string,
    provider: 'orange_money' | 'mtn_money' | 'moov_money',
    amount: number
  ): Promise<PaymentResult> {
    const response = await this.apiClient.post('/api/payments/mobile-money', {
      phone_number: phoneNumber,
      provider,
      amount,
      currency: 'XOF' // Franc CFA
    });
    
    return response.data;
  }

  // Vérifier statut paiement
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const response = await this.apiClient.get(`/api/payments/${paymentId}/status`);
    return response.data;
  }

  // Mes moyens de paiement
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await this.apiClient.get('/api/users/payment-methods');
    return response.data.payment_methods;
  }

  // Ajouter moyen de paiement
  async addPaymentMethod(methodData: any): Promise<PaymentMethod> {
    const response = await this.apiClient.post('/api/users/payment-methods', methodData);
    return response.data;
  }

  // Supprimer moyen de paiement
  async removePaymentMethod(methodId: string): Promise<void> {
    await this.apiClient.delete(`/api/users/payment-methods/${methodId}`);
  }
}
```

---

## 🔔 NOTIFICATIONS PUSH

### 📱 **Configuration Firebase (React Native)**
```typescript
// services/NotificationService.ts
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    type: 'order_update' | 'promotion' | 'new_product' | 'price_drop';
    action_url?: string;
    order_id?: string;
    product_id?: string;
  };
}

export class NotificationService {
  private apiClient = new AfrikModeApiClient();

  async initialize(): Promise<void> {
    // Demander permission
    const authStatus = await messaging().requestPermission({
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      provisional: false,
      sound: true,
    });

    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                   authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Permission notifications refusée');
      return;
    }

    // Obtenir token FCM
    const token = await messaging().getToken();
    console.log('FCM Token:', token);

    // Envoyer token au serveur
    await this.registerToken(token);

    // Écouter refresh token
    messaging().onTokenRefresh(this.registerToken.bind(this));

    // Configuration handlers
    this.setupNotificationHandlers();
  }

  private setupNotificationHandlers(): void {
    // Notification reçue quand app en foreground
    messaging().onMessage(async (message) => {
      console.log('Notification reçue (foreground):', message);
      
      // Afficher notification locale
      await this.showLocalNotification({
        title: message.notification?.title || '',
        body: message.notification?.body || '',
        data: message.data
      });
    });

    // Notification cliquée quand app fermée
    messaging().onNotificationOpenedApp((message) => {
      console.log('Notification cliquée (background):', message);
      this.handleNotificationAction(message);
    });

    // Notification qui a ouvert l'app
    messaging().getInitialNotification().then((message) => {
      if (message) {
        console.log('Notification qui a ouvert l\'app:', message);
        this.handleNotificationAction(message);
      }
    });
  }

  private async registerToken(token: string): Promise<void> {
    try {
      await this.apiClient.post('/api/users/fcm-token', {
        token,
        platform: Platform.OS,
        app_version: '1.0.0'
      });
      
      await AsyncStorage.setItem('fcm_token', token);
    } catch (error) {
      console.error('Erreur enregistrement token FCM:', error);
    }
  }

  private async showLocalNotification(payload: NotificationPayload): Promise<void> {
    // Utiliser react-native-push-notification ou @react-native-community/push-notification-ios
    // pour afficher notification locale
  }

  private handleNotificationAction(message: any): void {
    const { data } = message;
    
    if (!data) return;

    switch (data.type) {
      case 'order_update':
        if (data.order_id) {
          // Naviguer vers détail commande
          NavigationService.navigate('OrderDetail', { orderId: data.order_id });
        }
        break;
        
      case 'new_product':
      case 'price_drop':
        if (data.product_id) {
          // Naviguer vers détail produit
          NavigationService.navigate('ProductDetail', { productId: data.product_id });
        }
        break;
        
      case 'promotion':
        if (data.action_url) {
          // Ouvrir URL dans webview ou navigateur
          Linking.openURL(data.action_url);
        }
        break;
    }
  }

  // Préférences notifications
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const response = await this.apiClient.get('/api/users/notification-preferences');
    return response.data;
  }

  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    await this.apiClient.put('/api/users/notification-preferences', preferences);
  }

  // Désinscrire notifications
  async unregister(): Promise<void> {
    const token = await AsyncStorage.getItem('fcm_token');
    if (token) {
      await this.apiClient.delete('/api/users/fcm-token', {
        data: { token }
      });
      await AsyncStorage.removeItem('fcm_token');
    }
  }
}

interface NotificationPreferences {
  order_updates: boolean;
  promotions: boolean;
  price_drops: boolean;
  new_products: boolean;
  newsletter: boolean;
  sms_notifications: boolean;
  quiet_hours: {
    enabled: boolean;
    start_time: string; // HH:mm
    end_time: string; // HH:mm
  };
}
```

---

## 🔗 DEEP LINKS & NAVIGATION

### 📱 **Configuration Deep Links**

#### **React Native**
```typescript
// services/DeepLinkService.ts
import { Linking } from 'react-native';
import { NavigationService } from './NavigationService';

interface DeepLinkRoute {
  pattern: RegExp;
  handler: (params: any) => void;
}

export class DeepLinkService {
  private routes: DeepLinkRoute[] = [
    {
      pattern: /\/product\/([a-zA-Z0-9-]+)/,
      handler: ({ productId }) => NavigationService.navigate('ProductDetail', { productId })
    },
    {
      pattern: /\/store\/([a-zA-Z0-9-]+)/,
      handler: ({ storeId }) => NavigationService.navigate('StoreDetail', { storeId })
    },
    {
      pattern: /\/order\/([a-zA-Z0-9-]+)/,
      handler: ({ orderId }) => NavigationService.navigate('OrderDetail', { orderId })
    },
    {
      pattern: /\/category\/([a-zA-Z0-9-]+)/,
      handler: ({ categoryId }) => NavigationService.navigate('CategoryProducts', { categoryId })
    },
    {
      pattern: /\/search\?q=([^&]+)/,
      handler: ({ query }) => NavigationService.navigate('Search', { query: decodeURIComponent(query) })
    }
  ];

  async initialize(): Promise<void> {
    // Gérer lien qui a ouvert l'app
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      this.handleDeepLink(initialUrl);
    }

    // Écouter nouveaux liens
    const linkingListener = Linking.addEventListener('url', ({ url }) => {
      this.handleDeepLink(url);
    });

    // Nettoyer listener
    return () => linkingListener?.remove();
  }

  private handleDeepLink(url: string): void {
    console.log('Deep link reçu:', url);

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;

      for (const route of this.routes) {
        const match = path.match(route.pattern);
        if (match) {
          const params = this.extractParams(route.pattern, path);
          route.handler(params);
          return;
        }
      }

      // Route par défaut
      NavigationService.navigate('Home');
    } catch (error) {
      console.error('Erreur parsing deep link:', error);
      NavigationService.navigate('Home');
    }
  }

  private extractParams(pattern: RegExp, path: string): any {
    const match = path.match(pattern);
    if (!match) return {};

    const params: any = {};
    
    // Extraction basique des paramètres
    if (pattern.source.includes('product')) {
      params.productId = match[1];
    } else if (pattern.source.includes('store')) {
      params.storeId = match[1];
    } else if (pattern.source.includes('order')) {
      params.orderId = match[1];
    } else if (pattern.source.includes('category')) {
      params.categoryId = match[1];
    } else if (pattern.source.includes('search')) {
      params.query = match[1];
    }

    return params;
  }

  // Générer lien de partage
  generateShareLink(type: 'product' | 'store', id: string): string {
    const baseUrl = 'https://afrikmode.com';
    return `${baseUrl}/${type}/${id}?utm_source=mobile_app&utm_medium=share`;
  }
}
```

### 🧭 **Service Navigation**
```typescript
// services/NavigationService.ts
import { NavigationContainerRef } from '@react-navigation/native';

class NavigationService {
  private navigationRef = React.createRef<NavigationContainerRef>();

  setTopLevelNavigator(navigatorRef: NavigationContainerRef): void {
    this.navigationRef.current = navigatorRef;
  }

  navigate(routeName: string, params?: any): void {
    this.navigationRef.current?.navigate(routeName, params);
  }

  goBack(): void {
    this.navigationRef.current?.goBack();
  }

  getCurrentRoute(): string | undefined {
    return this.navigationRef.current?.getCurrentRoute()?.name;
  }
}

export default new NavigationService();
```

---

## 📍 GÉOLOCALISATION & LIVRAISON

### 🗺️ **Service Géolocalisation**
```typescript
// services/LocationService.ts
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface Address {
  street: string;
  city: string;
  postal_code: string;
  country: string;
  coordinates: Location;
}

export class LocationService {
  private apiClient = new AfrikModeApiClient();

  // Demander permission géolocalisation
  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permission Géolocalisation',
          message: 'AfrikMode a besoin d\'accéder à votre localisation pour calculer les frais de livraison.',
          buttonNeutral: 'Demander plus tard',
          buttonNegative: 'Refuser',
          buttonPositive: 'OK',
        }
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    
    return true; // iOS gère les permissions via Info.plist
  }

  // Obtenir position actuelle
  async getCurrentLocation(): Promise<Location> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Permission géolocalisation refusée');
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 0
          });
        },
        (error) => {
          reject(new Error(`Erreur géolocalisation: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    });
  }

  // Géocodage inverse (coordonnées -> adresse)
  async reverseGeocode(location: Location): Promise<Address> {
    const response = await this.apiClient.post('/api/location/reverse-geocode', {
      latitude: location.latitude,
      longitude: location.longitude
    });
    
    return response.data;
  }

  // Recherche d'adresses
  async searchAddresses(query: string, country: string = 'FR'): Promise<Address[]> {
    const response = await this.apiClient.get('/api/location/search', {
      params: { q: query, country }
    });
    
    return response.data.addresses;
  }

  // Calculer distance entre deux points
  calculateDistance(location1: Location, location2: Location): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(location2.latitude - location1.latitude);
    const dLon = this.toRadians(location2.longitude - location1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(location1.latitude)) *
              Math.cos(this.toRadians(location2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Obtenir magasins à proximité
  async getNearbyStores(location: Location, radius: number = 10): Promise<Store[]> {
    const response = await this.apiClient.get('/api/stores/nearby', {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        radius
      }
    });
    
    return response.data.stores;
  }
}
```

---

## 🎨 THÈME & UI MOBILE

### 🎯 **Design System Mobile**
```typescript
// theme/colors.ts
export const Colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9F9F9',
  
  text: {
    primary: '#000000',
    secondary: '#8E8E93',
    disabled: '#C7C7CC',
    inverse: '#FFFFFF'
  },
  
  border: {
    light: '#E5E5EA',
    medium: '#C7C7CC',
    dark: '#8E8E93'
  },
  
  // Mode sombre
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    text: {
      primary: '#FFFFFF',
      secondary: '#EBEBF5',
      disabled: '#48484A'
    }
  }
};

// theme/typography.ts
export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 38
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 34
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 30
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25
  },
  body1: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 22
  },
  body2: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 16
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20
  }
};

// theme/spacing.ts
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};
```

### 🧩 **Composants Réutilisables**
```typescript
// components/Button.tsx
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon
}) => {
  const styles = getButtonStyles(variant, size);
  
  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={styles.text.color} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={20} color={styles.text.color} />}
          <Text style={styles.text}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
```

Cette documentation mobile complète vous donne tous les outils pour créer une **app mobile performante** avec l'API AfrikMode ! 📱🚀

Maintenant créons l'index principal pour organiser toute la documentation.
