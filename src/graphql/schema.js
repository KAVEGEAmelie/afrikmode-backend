const { gql } = require('apollo-server-express');

/**
 * Schema GraphQL pour l'API AfrikMode
 */
const typeDefs = gql`
  scalar DateTime
  scalar Upload

  # =================== TYPES DE BASE ===================
  
  type User {
    id: ID!
    email: String!
    first_name: String
    last_name: String
    phone: String
    avatar_url: String
    role: UserRole!
    is_active: Boolean!
    created_at: DateTime!
    updated_at: DateTime!
    
    # Relations
    orders: [Order!]!
    reviews: [Review!]!
    store: Store
  }

  enum UserRole {
    CUSTOMER
    VENDOR
    ADMIN
  }

  type Store {
    id: ID!
    name: String!
    description: String
    slug: String
    logo_url: String
    banner_url: String
    address: String
    city: String
    country: String
    phone: String
    email: String
    is_active: Boolean!
    created_at: DateTime!
    updated_at: DateTime!
    
    # Relations
    owner: User!
    products: [Product!]!
    orders: [Order!]!
  }

  type Category {
    id: ID!
    name: String!
    description: String
    slug: String
    image_url: String
    is_active: Boolean!
    parent_id: ID
    created_at: DateTime!
    updated_at: DateTime!
    
    # Relations
    parent: Category
    children: [Category!]!
    products: [Product!]!
  }

  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    compare_at_price: Float
    sku: String
    slug: String
    images: [String!]!
    stock_quantity: Int!
    is_active: Boolean!
    weight: Float
    dimensions: ProductDimensions
    tags: [String!]!
    meta_title: String
    meta_description: String
    created_at: DateTime!
    updated_at: DateTime!
    
    # Relations
    store: Store!
    category: Category!
    reviews: [Review!]!
    order_items: [OrderItem!]!
    
    # Calculated fields
    average_rating: Float
    review_count: Int!
    is_in_stock: Boolean!
  }

  type ProductDimensions {
    length: Float
    width: Float
    height: Float
  }

  type Order {
    id: ID!
    order_number: String!
    status: OrderStatus!
    payment_status: PaymentStatus!
    subtotal: Float!
    tax_amount: Float!
    shipping_amount: Float!
    total_amount: Float!
    currency: String!
    shipping_address: Address!
    billing_address: Address!
    notes: String
    tracking_number: String
    created_at: DateTime!
    updated_at: DateTime!
    
    # Relations
    customer: User!
    store: Store!
    items: [OrderItem!]!
    payments: [Payment!]!
  }

  enum OrderStatus {
    PENDING
    CONFIRMED
    PROCESSING
    SHIPPED
    DELIVERED
    CANCELLED
    REFUNDED
  }

  enum PaymentStatus {
    PENDING
    AUTHORIZED
    CAPTURED
    FAILED
    CANCELLED
    REFUNDED
  }

  type OrderItem {
    id: ID!
    quantity: Int!
    unit_price: Float!
    total_price: Float!
    created_at: DateTime!
    
    # Relations
    order: Order!
    product: Product!
  }

  type Address {
    street: String!
    city: String!
    state: String
    postal_code: String!
    country: String!
  }

  type Payment {
    id: ID!
    amount: Float!
    currency: String!
    payment_method: String!
    status: PaymentStatus!
    transaction_id: String
    gateway_response: String
    created_at: DateTime!
    
    # Relations
    order: Order!
  }

  type Review {
    id: ID!
    rating: Int!
    title: String
    comment: String
    is_approved: Boolean!
    created_at: DateTime!
    updated_at: DateTime!
    
    # Relations
    product: Product!
    user: User!
  }

  # =================== TYPES D'ENTRÉE ===================

  input UserInput {
    email: String!
    password: String!
    first_name: String
    last_name: String
    phone: String
    role: UserRole = CUSTOMER
  }

  input UpdateUserInput {
    first_name: String
    last_name: String
    phone: String
    avatar_url: String
  }

  input StoreInput {
    name: String!
    description: String
    address: String
    city: String
    country: String
    phone: String
    email: String
    logo_url: String
    banner_url: String
  }

  input UpdateStoreInput {
    name: String
    description: String
    address: String
    city: String
    country: String
    phone: String
    email: String
    logo_url: String
    banner_url: String
  }

  input CategoryInput {
    name: String!
    description: String
    parent_id: ID
    image_url: String
  }

  input UpdateCategoryInput {
    name: String
    description: String
    parent_id: ID
    image_url: String
    is_active: Boolean
  }

  input ProductInput {
    name: String!
    description: String!
    price: Float!
    compare_at_price: Float
    sku: String
    category_id: ID!
    store_id: ID!
    images: [String!]!
    stock_quantity: Int!
    weight: Float
    dimensions: ProductDimensionsInput
    tags: [String!]
    meta_title: String
    meta_description: String
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    compare_at_price: Float
    sku: String
    category_id: ID
    images: [String!]
    stock_quantity: Int
    weight: Float
    dimensions: ProductDimensionsInput
    tags: [String!]
    meta_title: String
    meta_description: String
    is_active: Boolean
  }

  input ProductDimensionsInput {
    length: Float
    width: Float
    height: Float
  }

  input OrderInput {
    store_id: ID!
    items: [OrderItemInput!]!
    shipping_address: AddressInput!
    billing_address: AddressInput!
    notes: String
  }

  input OrderItemInput {
    product_id: ID!
    quantity: Int!
  }

  input AddressInput {
    street: String!
    city: String!
    state: String
    postal_code: String!
    country: String!
  }

  input ReviewInput {
    product_id: ID!
    rating: Int!
    title: String
    comment: String
  }

  input UpdateReviewInput {
    rating: Int
    title: String
    comment: String
  }

  # =================== TYPES DE FILTRES ===================

  input ProductFilters {
    category_id: ID
    store_id: ID
    min_price: Float
    max_price: Float
    in_stock_only: Boolean
    tags: [String!]
    search: String
  }

  input OrderFilters {
    status: OrderStatus
    payment_status: PaymentStatus
    store_id: ID
    customer_id: ID
    start_date: DateTime
    end_date: DateTime
  }

  # =================== TYPES DE RÉPONSE ===================

  type AuthPayload {
    success: Boolean!
    message: String!
    token: String
    user: User
  }

  type PaginatedProducts {
    products: [Product!]!
    total_count: Int!
    page: Int!
    per_page: Int!
    total_pages: Int!
  }

  type PaginatedOrders {
    orders: [Order!]!
    total_count: Int!
    page: Int!
    per_page: Int!
    total_pages: Int!
  }

  type PaginatedStores {
    stores: [Store!]!
    total_count: Int!
    page: Int!
    per_page: Int!
    total_pages: Int!
  }

  type ApiResponse {
    success: Boolean!
    message: String!
    data: String
  }

  # =================== STATISTIQUES ===================

  type DashboardStats {
    total_products: Int!
    total_orders: Int!
    total_revenue: Float!
    total_customers: Int!
    recent_orders: [Order!]!
    top_products: [Product!]!
  }

  type ProductStats {
    total_views: Int!
    total_sales: Int!
    revenue: Float!
    average_rating: Float!
    review_count: Int!
  }

  # =================== QUERIES ===================

  type Query {
    # Auth
    me: User
    
    # Users
    users(page: Int = 1, per_page: Int = 20): [User!]!
    user(id: ID!): User
    
    # Stores
    stores(page: Int = 1, per_page: Int = 20): PaginatedStores!
    store(id: ID!): Store
    storeBySlug(slug: String!): Store
    
    # Categories
    categories: [Category!]!
    category(id: ID!): Category
    categoryBySlug(slug: String!): Category
    
    # Products
    products(
      filters: ProductFilters
      page: Int = 1
      per_page: Int = 20
      sort_by: String = "created_at"
      sort_order: String = "desc"
    ): PaginatedProducts!
    product(id: ID!): Product
    productBySlug(slug: String!): Product
    searchProducts(query: String!, page: Int = 1, per_page: Int = 20): PaginatedProducts!
    
    # Orders
    orders(filters: OrderFilters, page: Int = 1, per_page: Int = 20): PaginatedOrders!
    order(id: ID!): Order
    myOrders(page: Int = 1, per_page: Int = 20): PaginatedOrders!
    
    # Reviews
    reviews(product_id: ID!, page: Int = 1, per_page: Int = 10): [Review!]!
    review(id: ID!): Review
    
    # Stats
    dashboardStats: DashboardStats!
    productStats(id: ID!): ProductStats!
  }

  # =================== MUTATIONS ===================

  type Mutation {
    # Auth
    register(input: UserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: ApiResponse!
    refreshToken: AuthPayload!
    
    # Users
    updateProfile(input: UpdateUserInput!): User!
    deleteAccount: ApiResponse!
    
    # Stores
    createStore(input: StoreInput!): Store!
    updateStore(id: ID!, input: UpdateStoreInput!): Store!
    deleteStore(id: ID!): ApiResponse!
    
    # Categories (Admin only)
    createCategory(input: CategoryInput!): Category!
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
    deleteCategory(id: ID!): ApiResponse!
    
    # Products
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): ApiResponse!
    uploadProductImages(product_id: ID!, images: [Upload!]!): [String!]!
    
    # Orders
    createOrder(input: OrderInput!): Order!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!
    cancelOrder(id: ID!): Order!
    
    # Reviews
    createReview(input: ReviewInput!): Review!
    updateReview(id: ID!, input: UpdateReviewInput!): Review!
    deleteReview(id: ID!): ApiResponse!
    approveReview(id: ID!): Review! # Admin only
    
    # Cart (if needed)
    addToCart(product_id: ID!, quantity: Int!): ApiResponse!
    updateCartItem(product_id: ID!, quantity: Int!): ApiResponse!
    removeFromCart(product_id: ID!): ApiResponse!
    clearCart: ApiResponse!
  }

  # =================== SUBSCRIPTIONS ===================

  type Subscription {
    # Orders
    orderStatusUpdated(order_id: ID!): Order!
    newOrderReceived(store_id: ID!): Order!
    
    # Products
    productStockUpdated(product_id: ID!): Product!
    
    # Notifications
    notificationReceived(user_id: ID!): String!
  }
`;

module.exports = typeDefs;