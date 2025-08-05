
// Using direct fetch instead of apiRequest since we're outside the client context
import fetch from 'node-fetch';

// Server runs on port 5000
const API_URL = 'http://localhost:5000';

async function apiRequest(method: string, endpoint: string, data?: any) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }
  
  return response;
}

const foodItems = [
  // Salads
  {
    name: "Mixed Green Salad",
    description: "vinaigrette, sliced tomato, crispy potato sticks & Romano cheese",
    type: "salad",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    allergens: ["dairy"],
    dietaryRestrictions: ["vegetarian", "gluten-free"],
    price: 1500
  },
  {
    name: "Caesar Salad",
    description: "tossed with traditional Caesar dressing, garlic croutons & light shavings of Parmigiano Reggiano",
    type: "salad",
    image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9",
    allergens: ["dairy", "gluten"],
    dietaryRestrictions: ["vegetarian"],
    price: 1500
  },
  {
    name: "Grape & Walnut Salad",
    description: "Mixed greens, gorgonzola crumbles, citrus walnut vinaigrette",
    type: "salad",
    image: "https://images.unsplash.com/photo-1604497181015-76590d828b75",
    allergens: ["dairy", "tree_nuts"],
    dietaryRestrictions: ["vegetarian", "gluten-free"],
    price: 1600
  },

  // Entrees
  {
    name: "Fresh Branzino Francaise",
    description: "Sautéed in light batter, lemon Pinot Grigio sauce, vegetable rice",
    type: "entree",
    image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2",
    allergens: ["fish", "eggs"],
    dietaryRestrictions: ["gluten-free"],
    price: 3200
  },
  {
    name: "Chicken Marsala",
    description: "Red Bird Farms chicken breast sautéed in mushroom wine sauce, served with creamy polenta and sugar snap peas",
    type: "entree",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1",
    allergens: ["dairy"],
    dietaryRestrictions: ["gluten-free"],
    price: 2800
  },
  {
    name: "Eggplant Lasagna",
    description: "layers of eggplant, with both tomato & besciamella sauce, baked with fontina cheese & served with a side of sautéed vegetables",
    type: "entree",
    image: "https://images.unsplash.com/photo-1572715376701-98568319fd0b",
    allergens: ["dairy"],
    dietaryRestrictions: ["vegetarian", "gluten-free"],
    price: 2800
  },
  {
    name: "Crab Filled Chicken Breast",
    description: "Demi-glace cream sauce with vegetable rice",
    type: "entree",
    image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435",
    allergens: ["dairy", "shellfish"],
    dietaryRestrictions: [],
    price: 3000
  },
  {
    name: "Grilled Chicken Eggplant & Mushrooms",
    description: "Grilled eggplant, maitake mushrooms, balsamic reduction, vegetable pasta",
    type: "entree",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1",
    allergens: ["gluten"],
    dietaryRestrictions: [],
    price: 2800
  },
  {
    name: "Penne & Sausage",
    description: "roasted red peppers, tomato sauce & baked fontina cheese",
    type: "entree",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9",
    allergens: ["gluten", "dairy"],
    dietaryRestrictions: [],
    price: 2600
  },
  {
    name: "Vegan Bolognese",
    description: "Plant-based meat & mushroom bolognese sauce, gf penne pasta, vegan parmesan cheese",
    type: "entree",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9",
    allergens: [],
    dietaryRestrictions: ["vegan", "vegetarian", "gluten-free", "dairy-free"],
    price: 2800
  },
  {
    name: "Cabernet Braised Short Ribs",
    description: "Vegetable tomato-beef broth over creamy polenta",
    type: "entree",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947",
    allergens: ["dairy"],
    dietaryRestrictions: ["gluten-free"],
    price: 3400
  },
  {
    name: "Breaded Stuffed Pork Medallions",
    description: "Spinach-fontina cheese filling, Marsala wine sauce, garlic potato puree",
    type: "entree",
    image: "https://images.unsplash.com/photo-1432139555190-58524dae6a55",
    allergens: ["dairy", "gluten"],
    dietaryRestrictions: [],
    price: 3000
  },

  // Desserts
  {
    name: "Creme Brulee",
    description: "baked vanilla custard with glazed brown sugar topping, fresh fruit & berries on side",
    type: "dessert",
    image: "https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3",
    allergens: ["dairy", "eggs"],
    dietaryRestrictions: ["vegetarian", "gluten-free"],
    price: 1200
  },
  {
    name: "Chocolate Molten Cake",
    description: "served warm with fresh whipped cream & berries on side",
    type: "dessert",
    image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b",
    allergens: ["dairy", "gluten", "eggs"],
    dietaryRestrictions: ["vegetarian"],
    price: 1200
  },
  {
    name: "Tiramisu",
    description: "Espresso soaked lady fingers, mascarpone, cocoa & berries on side",
    type: "dessert",
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9",
    allergens: ["dairy", "gluten", "eggs"],
    dietaryRestrictions: ["vegetarian"],
    price: 1200
  },
  {
    name: "Gelato Bar",
    description: "Selection of assorted toppings & berries on side",
    type: "dessert",
    image: "https://images.unsplash.com/photo-1559703248-dcaaec9fab78",
    allergens: ["dairy"],
    dietaryRestrictions: ["vegetarian"],
    price: 1000
  },
  {
    name: "Warm Bread Pudding",
    description: "Croissants, apple, Tuaca caramel sauce, whipped cream & berries on side",
    type: "dessert",
    image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51",
    allergens: ["dairy", "gluten", "eggs"],
    dietaryRestrictions: ["vegetarian"],
    price: 1200
  },
  {
    name: "Chocolate Custard Cake",
    description: "served warm with fresh whipped cream & berries on side",
    type: "dessert",
    image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b",
    allergens: ["dairy", "gluten", "eggs"],
    dietaryRestrictions: ["vegetarian"],
    price: 1200
  }
];

async function populateMenu() {
  try {
    for (const item of foodItems) {
      console.log(`Creating food item: ${item.name}`);
      const response = await apiRequest("POST", "/api/food-options", item);
      const responseData = await response.json();
      console.log(`Created food item: ${item.name} with ID: ${responseData.id}`);
    }
    console.log("Menu population complete!");
  } catch (error) {
    console.error("Error populating menu:", error);
  }
}

populateMenu();
