export interface Store {
  id: number;
  name: string;
  description: string;
  address: string;
  imageUrl: string;
  logoUrl?: string;
  rating: string;
  category: string;
}

export interface Product {
  id: number;
  storeId: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  quantity: number;
  pickupStart: string;
  pickupEnd: string;
  imageUrl: string;
  store?: Store;
}

export const mockStores: Store[] = [
  {
    id: 1,
    name: "The Crusty Loaf",
    description: "Artisan bakery with fresh sourdough and pastries.",
    address: "123 Baker St, San Francisco",
    category: "Bakery",
    rating: "4.8",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
    logoUrl: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=200&q=80"
  },
  {
    id: 2,
    name: "Sushi Zen",
    description: "Authentic sushi and japanese rolls.",
    address: "456 Ocean Ave, San Francisco",
    category: "Sushi",
    rating: "4.5",
    imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
    logoUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=200&q=80"
  },
  {
    id: 3,
    name: "Green Valley Market",
    description: "Organic fruits, vegetables and groceries.",
    address: "789 Farm Rd, San Francisco",
    category: "Groceries",
    rating: "4.2",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    logoUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=200&q=80"
  },
  {
    id: 4,
    name: "Pizza Palace",
    description: "Fresh Italian pizza and pasta.",
    address: "321 Main St, San Francisco",
    category: "Pizza",
    rating: "4.6",
    imageUrl: "https://images.unsplash.com/photo-1571407-615cff40f5d3?w=800&q=80",
    logoUrl: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=200&q=80"
  },
  {
    id: 5,
    name: "Sweet Delights",
    description: "Desserts, cakes and pastries.",
    address: "555 Sugar Ln, San Francisco",
    category: "Desserts",
    rating: "4.9",
    imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80",
    logoUrl: "https://images.unsplash.com/photo-1557159552-f1898ceac46c?w=200&q=80"
  }
];

export const mockProducts: Product[] = [
  {
    id: 1,
    storeId: 1,
    name: "Magic Bread Bag",
    description: "Assorted breads, pastries and buns. Includes sourdough, ciabatta, focaccia and fresh croissants.",
    price: 399,
    originalPrice: 1200,
    quantity: 5,
    pickupStart: "17:00",
    pickupEnd: "18:00",
    imageUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&q=80",
  },
  {
    id: 2,
    storeId: 2,
    name: "Sushi Surprise Box",
    description: "Fresh sushi rolls, sashimi and edamame. Today's special selection includes California rolls, spicy tuna, and salmon nigiri.",
    price: 599,
    originalPrice: 1800,
    quantity: 3,
    pickupStart: "20:30",
    pickupEnd: "21:30",
    imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&q=80",
  },
  {
    id: 3,
    storeId: 3,
    name: "Organic Fruit & Veg Box",
    description: "Seasonal organic produce. Includes fresh vegetables, seasonal fruits and salad greens.",
    price: 450,
    originalPrice: 1500,
    quantity: 8,
    pickupStart: "19:00",
    pickupEnd: "20:00",
    imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80",
  },
  {
    id: 4,
    storeId: 4,
    name: "Pizza Bundle",
    description: "2 large pizzas with your choice of toppings. Perfect for sharing!",
    price: 799,
    originalPrice: 2400,
    quantity: 4,
    pickupStart: "18:30",
    pickupEnd: "19:30",
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561a1b?w=800&q=80",
  },
  {
    id: 5,
    storeId: 1,
    name: "Pastry Paradise",
    description: "Selection of fresh pastries including pain au chocolat, almond croissants, and danish pastries.",
    price: 299,
    originalPrice: 900,
    quantity: 6,
    pickupStart: "16:00",
    pickupEnd: "17:00",
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80",
  },
  {
    id: 6,
    storeId: 5,
    name: "Cake & Dessert Box",
    description: "Mix of cakes, brownies, eclairs and macarons.",
    price: 549,
    originalPrice: 1600,
    quantity: 5,
    pickupStart: "19:00",
    pickupEnd: "20:00",
    imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80",
  },
  {
    id: 7,
    storeId: 3,
    name: "Salad & Greens",
    description: "Fresh lettuce, spinach, arugula and seasonal vegetables.",
    price: 349,
    originalPrice: 1200,
    quantity: 7,
    pickupStart: "18:00",
    pickupEnd: "19:00",
    imageUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
  },
  {
    id: 8,
    storeId: 2,
    name: "Ramen Combo",
    description: "Two servings of authentic ramen with noodles, broth and toppings.",
    price: 699,
    originalPrice: 2000,
    quantity: 2,
    pickupStart: "21:00",
    pickupEnd: "22:00",
    imageUrl: "https://images.unsplash.com/photo-1623521885457-c3400ca199e7?w=800&q=80",
  }
];

// Add store reference to products
export const mockProductsWithStores = mockProducts.map(product => ({
  ...product,
  store: mockStores.find(store => store.id === product.storeId)!
}));
