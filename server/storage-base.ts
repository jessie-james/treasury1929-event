import {
  type User, type Event, type Ticket, type Booking, type BookingWithDetails,
  type Table, type Seat, type TableWithSeats, type MenuItem, type VenueStaff,
  type InsertAdminLog, type AdminLog, type Venue, type Stage, type VenueWithTables
} from "@shared/schema";

/**
 * Interface for storage implementations
 */
export interface IStorage {
  // User methods
  getAllUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(userData: any): Promise<number>;
  updateUserProfile(userId: number, profile: Partial<User>): Promise<User | null>;
  updateUserPassword(userId: number, newPassword: string): Promise<boolean>;
  updateUserDietaryPreferences(userId: number, allergens: string[], dietaryRestrictions: string[]): Promise<boolean>;
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | null>;
  updateUserStripeInfo(userId: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User | null>;

  // Venue methods
  getAllVenues(): Promise<Venue[]>;
  getVenueById(id: number): Promise<Venue | null>;
  getVenueWithTables(id: number): Promise<VenueWithTables | null>;
  createVenue(venueData: any): Promise<number>;
  updateVenue(id: number, venueData: Partial<Venue>): Promise<Venue | null>;
  deleteVenue(id: number): Promise<boolean>;

  // Stage methods
  getStagesByVenue(venueId: number): Promise<Stage[]>;
  getStage(id: number): Promise<Stage | null>;
  createStage(stageData: any): Promise<number>;
  updateStage(id: number, stageData: Partial<Stage>): Promise<Stage | null>;
  deleteStage(id: number): Promise<boolean>;

  // Event methods
  getAllEvents(): Promise<Event[]>;
  getActiveEvents(): Promise<Event[]>;
  getEventById(id: number): Promise<Event | null>;
  createEvent(eventData: any): Promise<number>;
  updateEvent(id: number, eventData: Partial<any>): Promise<Event | null>;
  deleteEvent(id: number): Promise<boolean>;

  // Booking methods - Updated for table-based booking
  getBookings(): Promise<Booking[]>;
  getBookingsByUserId(userId: number): Promise<BookingWithDetails[]>;
  getBookingsByEventId(eventId: number): Promise<BookingWithDetails[]>;
  getBooking(id: number): Promise<Booking | null>;
  getBookingWithDetails(id: number): Promise<BookingWithDetails | null>;
  getAllBookingsWithDetails(): Promise<BookingWithDetails[]>;
  getBookingByPaymentId(paymentId: string): Promise<Booking | null>;
  createBooking(bookingData: any): Promise<number>;
  updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | null>;
  deleteBooking(id: number): Promise<boolean>;
  getTablesByEventId(eventId: number): Promise<Table[]>;
  getAvailableTablesByEventId(eventId: number): Promise<Table[]>;
  updateEventAvailability(eventId: number): Promise<boolean>;
  checkInBooking(bookingId: number, checkedInBy: number): Promise<Booking | null>;
  updateBookingStatus(id: number, status: string, modifiedBy?: number): Promise<Booking | null>;
  processRefund(bookingId: number, refundAmount: number, refundId: string, modifiedBy: number): Promise<Booking | null>;

  // Table methods
  getVenues(): Promise<{ id: number, name: string }[]>;
  getTables(): Promise<Table[]>;
  getTablesByVenue(venueId: number): Promise<Table[]>;
  getTablesByVenueAndFloor(venueId: number, floor: string): Promise<Table[]>;
  getTablesWithSeats(venueId: number): Promise<TableWithSeats[]>;
  getTable(id: number): Promise<Table | null>;
  getTableWithSeats(id: number): Promise<TableWithSeats | null>;
  createTable(tableData: any): Promise<number>;
  updateTable(id: number, tableData: Partial<Table>): Promise<boolean>;
  deleteTable(id: number): Promise<boolean>;

  // Seat methods
  getSeats(): Promise<Seat[]>;
  getTableSeats(tableId: number): Promise<Seat[]>;
  getSeat(id: number): Promise<Seat | null>;
  createSeat(seatData: any): Promise<number>;
  updateSeat(id: number, seatData: Partial<Seat>): Promise<boolean>;
  deleteSeat(id: number): Promise<boolean>;

  // Menu methods
  getMenuCategories(): Promise<string[]>;
  getMenuItems(category?: string): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | null>;
  createMenuItem(itemData: any): Promise<number>;
  updateMenuItem(id: number, itemData: Partial<MenuItem>): Promise<boolean>;
  deleteMenuItem(id: number): Promise<boolean>;

  // Staff methods
  getVenueStaff(): Promise<VenueStaff[]>;
  getStaffMember(id: number): Promise<VenueStaff | null>;
  getStaffByUserId(userId: number): Promise<VenueStaff | null>;
  createStaffMember(staffData: any): Promise<number>;
  updateStaffMember(id: number, staffData: Partial<VenueStaff>): Promise<boolean>;
  deleteStaffMember(id: number): Promise<boolean>;

  // Utility methods
  clearAllBookings(): Promise<boolean>;
  
  // Admin Log methods
  createAdminLog(logData: InsertAdminLog): Promise<number>;
  getAdminLogs(): Promise<AdminLog[]>;
  getAdminLogsByEntityType(entityType: string): Promise<AdminLog[]>;
  
  // Layout methods
  getFloors(venueId: number): Promise<any[]>;
  getZones(venueId: number): Promise<any[]>;
  getLayoutTemplates(venueId: number): Promise<any[]>;
  saveLayoutTemplate(venueId: number, templateData: any): Promise<any>;
  updateFloorImage(venueId: number, floorId: string, imageUrl: string): Promise<boolean>;
}

/**
 * In-memory storage implementation for testing and development
 */
export class MemStorage implements IStorage {
  // Basic in-memory implementation
  private users: User[] = [];
  private events: Event[] = [];
  private bookings: Booking[] = [];
  private tables: Table[] = [];
  private seats: Seat[] = [];
  private menuItems: MenuItem[] = [];
  private venueStaffMembers: VenueStaff[] = [];

  // Implement required methods with in-memory storage
  // This is a minimal implementation for compatibility
  
  // User Methods
  async getAllUsers(): Promise<User[]> {
    return this.users;
  }
  
  async getUserById(id: number): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }
  
  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }
  
  async createUser(userData: any): Promise<number> {
    const id = this.users.length + 1;
    const user = { ...userData, id };
    this.users.push(user as User);
    return id;
  }
  
  async updateUserProfile(userId: number, profile: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) return null;
    this.users[index] = { ...this.users[index], ...profile };
    return this.users[index];
  }
  
  async updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
    return true;
  }
  
  async updateUserDietaryPreferences(userId: number, allergens: string[], dietaryRestrictions: string[]): Promise<boolean> {
    return true;
  }
  
  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | null> {
    return null;
  }
  
  async updateUserStripeInfo(userId: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User | null> {
    return null;
  }
  
  // Event Methods
  async getAllEvents(): Promise<Event[]> {
    return this.events;
  }
  
  async getActiveEvents(): Promise<Event[]> {
    return this.events.filter(e => e.isActive);
  }
  
  async getEventById(id: number): Promise<Event | null> {
    return this.events.find(e => e.id === id) || null;
  }
  
  async createEvent(eventData: any): Promise<number> {
    const id = this.events.length + 1;
    const event = { ...eventData, id };
    this.events.push(event as Event);
    return id;
  }
  
  async updateEvent(id: number, eventData: Partial<any>): Promise<Event | null> {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.events[index] = { ...this.events[index], ...eventData };
    return this.events[index];
  }
  
  async deleteEvent(id: number): Promise<boolean> {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.events.splice(index, 1);
    return true;
  }
  
  // Booking Methods
  async getBookings(): Promise<Booking[]> {
    return this.bookings;
  }
  
  async getBookingsByUserId(userId: number): Promise<BookingWithDetails[]> {
    return [];
  }
  
  async getBookingsByEventId(eventId: number): Promise<BookingWithDetails[]> {
    return [];
  }
  
  async getBooking(id: number): Promise<Booking | null> {
    return this.bookings.find(b => b.id === id) || null;
  }
  
  async getBookingWithDetails(id: number): Promise<BookingWithDetails | null> {
    return null;
  }
  
  async getBookingByPaymentId(paymentId: string): Promise<Booking | null> {
    return null;
  }
  
  async createBooking(bookingData: any): Promise<number> {
    const id = this.bookings.length + 1;
    const booking = { ...bookingData, id };
    this.bookings.push(booking as Booking);
    return id;
  }
  
  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | null> {
    const index = this.bookings.findIndex(b => b.id === id);
    if (index === -1) return null;
    this.bookings[index] = { ...this.bookings[index], ...bookingData };
    return this.bookings[index];
  }
  
  async deleteBooking(id: number): Promise<boolean> {
    const index = this.bookings.findIndex(b => b.id === id);
    if (index === -1) return false;
    this.bookings.splice(index, 1);
    return true;
  }
  
  async getSeatsByEventId(eventId: number): Promise<any[]> {
    return [];
  }
  
  async updateEventAvailability(eventId: number): Promise<boolean> {
    return true;
  }
  
  async checkInBooking(bookingId: number, checkedInBy: number): Promise<Booking | null> {
    return null;
  }
  
  async updateBookingStatus(id: number, status: string, modifiedBy?: number): Promise<Booking | null> {
    return null;
  }
  
  async processRefund(bookingId: number, refundAmount: number, refundId: string, modifiedBy: number): Promise<Booking | null> {
    return null;
  }
  
  // Table Methods
  async getVenues(): Promise<{ id: number, name: string }[]> {
    return [{ id: 1, name: "Default Venue" }];
  }
  
  async getTables(): Promise<Table[]> {
    return this.tables;
  }
  
  async getTablesByVenue(venueId: number): Promise<Table[]> {
    return this.tables.filter(t => t.venueId === venueId);
  }
  
  async getTablesByVenueAndFloor(venueId: number, floor: string): Promise<Table[]> {
    return this.tables.filter(t => t.venueId === venueId && t.floor === floor);
  }
  
  async getTablesWithSeats(venueId: number): Promise<TableWithSeats[]> {
    return [];
  }
  
  async getTable(id: number): Promise<Table | null> {
    return this.tables.find(t => t.id === id) || null;
  }
  
  async getTableWithSeats(id: number): Promise<TableWithSeats | null> {
    return null;
  }
  
  async createTable(tableData: any): Promise<number> {
    const id = this.tables.length + 1;
    const table = { ...tableData, id };
    this.tables.push(table as Table);
    return id;
  }
  
  async updateTable(id: number, tableData: Partial<Table>): Promise<boolean> {
    const index = this.tables.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.tables[index] = { ...this.tables[index], ...tableData };
    return true;
  }
  
  async deleteTable(id: number): Promise<boolean> {
    const index = this.tables.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.tables.splice(index, 1);
    return true;
  }
  
  // Seat Methods
  async getSeats(): Promise<Seat[]> {
    return this.seats;
  }
  
  async getTableSeats(tableId: number): Promise<Seat[]> {
    return this.seats.filter(s => s.tableId === tableId);
  }
  
  async getSeat(id: number): Promise<Seat | null> {
    return this.seats.find(s => s.id === id) || null;
  }
  
  async createSeat(seatData: any): Promise<number> {
    const id = this.seats.length + 1;
    const seat = { ...seatData, id };
    this.seats.push(seat as Seat);
    return id;
  }
  
  async updateSeat(id: number, seatData: Partial<Seat>): Promise<boolean> {
    const index = this.seats.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.seats[index] = { ...this.seats[index], ...seatData };
    return true;
  }
  
  async deleteSeat(id: number): Promise<boolean> {
    const index = this.seats.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.seats.splice(index, 1);
    return true;
  }
  
  // Menu Methods
  async getMenuCategories(): Promise<string[]> {
    return [];
  }
  
  async getMenuItems(category?: string): Promise<MenuItem[]> {
    return this.menuItems;
  }
  
  async getMenuItem(id: number): Promise<MenuItem | null> {
    return this.menuItems.find(m => m.id === id) || null;
  }
  
  async createMenuItem(itemData: any): Promise<number> {
    const id = this.menuItems.length + 1;
    const item = { ...itemData, id };
    this.menuItems.push(item as MenuItem);
    return id;
  }
  
  async updateMenuItem(id: number, itemData: Partial<MenuItem>): Promise<boolean> {
    const index = this.menuItems.findIndex(m => m.id === id);
    if (index === -1) return false;
    this.menuItems[index] = { ...this.menuItems[index], ...itemData };
    return true;
  }
  
  async deleteMenuItem(id: number): Promise<boolean> {
    const index = this.menuItems.findIndex(m => m.id === id);
    if (index === -1) return false;
    this.menuItems.splice(index, 1);
    return true;
  }
  
  // Staff Methods
  async getVenueStaff(): Promise<VenueStaff[]> {
    return this.venueStaffMembers;
  }
  
  async getStaffMember(id: number): Promise<VenueStaff | null> {
    return this.venueStaffMembers.find(s => s.id === id) || null;
  }
  
  async getStaffByUserId(userId: number): Promise<VenueStaff | null> {
    return this.venueStaffMembers.find(s => s.userId === userId) || null;
  }
  
  async createStaffMember(staffData: any): Promise<number> {
    const id = this.venueStaffMembers.length + 1;
    const staff = { ...staffData, id };
    this.venueStaffMembers.push(staff as VenueStaff);
    return id;
  }
  
  async updateStaffMember(id: number, staffData: Partial<VenueStaff>): Promise<boolean> {
    const index = this.venueStaffMembers.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.venueStaffMembers[index] = { ...this.venueStaffMembers[index], ...staffData };
    return true;
  }
  
  async deleteStaffMember(id: number): Promise<boolean> {
    const index = this.venueStaffMembers.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.venueStaffMembers.splice(index, 1);
    return true;
  }
  
  // Utility Methods
  async clearAllBookings(): Promise<boolean> {
    this.bookings = [];
    return true;
  }
  
  // Layout Methods
  // Legacy layout methods - removed in favor of simplified venue design

  // Admin Log methods
  async createAdminLog(logData: InsertAdminLog): Promise<number> {
    return 1; // Just return a dummy ID for in-memory storage
  }
  
  async getAdminLogs(): Promise<AdminLog[]> {
    return [];
  }
  
  async getAdminLogsByEntityType(entityType: string): Promise<AdminLog[]> {
    return [];
  }
}