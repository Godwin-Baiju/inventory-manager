-- =====================================================
-- INVENTORY MANAGER - SUPABASE DATABASE SCHEMA
-- =====================================================
-- This script recreates the complete database schema
-- for the inventory management system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
-- Stores user profile information linked to auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. INVENTORY ITEMS TABLE
-- =====================================================
-- Main table for storing inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_name TEXT NOT NULL,
    item_brand TEXT NOT NULL,
    size TEXT NOT NULL,
    stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0),
    low_stock_warning INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_warning > 0),
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- 3. STOCK TRANSACTIONS TABLE
-- =====================================================
-- Tracks all stock movements (in/out)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    previous_stock INTEGER NOT NULL CHECK (previous_stock >= 0),
    new_stock INTEGER NOT NULL CHECK (new_stock >= 0),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- 4. RESERVATIONS TABLE
-- =====================================================
-- Tracks item reservations for parties
CREATE TABLE IF NOT EXISTS reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    party_name TEXT NOT NULL,
    party_contact TEXT,
    party_address TEXT,
    reserved_quantity INTEGER NOT NULL CHECK (reserved_quantity > 0),
    reserved_until TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Inventory items indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_brand ON inventory_items(item_brand);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(stock_qty);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON inventory_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_updated_at ON inventory_items(updated_at DESC);

-- Stock transactions indexes
CREATE INDEX IF NOT EXISTS idx_stock_transactions_item_id ON stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at ON stock_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_by ON stock_transactions(created_by);

-- Reservations indexes
CREATE INDEX IF NOT EXISTS idx_reservations_item_id ON reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_reserved_until ON reservations(reserved_until);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_created_by ON reservations(created_by);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- =====================================================
-- 6. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_inventory_items_updated_at 
    BEFORE UPDATE ON inventory_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at 
    BEFORE UPDATE ON reservations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Function to recompute reserved quantity for an item
CREATE OR REPLACE FUNCTION recompute_reserved_quantity(p_item_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_reserved INTEGER;
BEGIN
    -- Calculate total active reservations for the item
    SELECT COALESCE(SUM(reserved_quantity), 0)
    INTO total_reserved
    FROM reservations
    WHERE item_id = p_item_id AND status = 'active';
    
    -- Update the inventory item
    UPDATE inventory_items
    SET reserved_quantity = total_reserved
    WHERE id = p_item_id;
    
    RETURN total_reserved;
END;
$$ LANGUAGE plpgsql;

-- Function to check if there's enough available stock
CREATE OR REPLACE FUNCTION check_available_stock(p_item_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    available_stock INTEGER;
BEGIN
    SELECT (stock_qty - COALESCE(reserved_quantity, 0))
    INTO available_stock
    FROM inventory_items
    WHERE id = p_item_id;
    
    RETURN available_stock >= p_quantity;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for inventory items with user information
CREATE OR REPLACE VIEW inventory_items_with_users AS
SELECT 
    ii.*,
    up_creator.full_name as creator_name,
    up_updater.full_name as updater_name
FROM inventory_items ii
LEFT JOIN user_profiles up_creator ON ii.created_by = up_creator.id
LEFT JOIN user_profiles up_updater ON ii.updated_by = up_updater.id;

-- View for stock transactions with user information
CREATE OR REPLACE VIEW stock_transactions_with_users AS
SELECT 
    st.*,
    up.full_name as user_name
FROM stock_transactions st
LEFT JOIN user_profiles up ON st.created_by = up.id;

-- View for reservations with user and item information
CREATE OR REPLACE VIEW reservations_with_details AS
SELECT 
    r.*,
    up.full_name as user_name,
    ii.item_name,
    ii.item_brand,
    ii.size,
    ii.stock_qty
FROM reservations r
LEFT JOIN user_profiles up ON r.created_by = up.id
LEFT JOIN inventory_items ii ON r.item_id = ii.id;

-- View for reservations with user information (alias for compatibility)
CREATE OR REPLACE VIEW reservations_with_users AS
SELECT 
    r.*,
    up.full_name as user_name
FROM reservations r
LEFT JOIN user_profiles up ON r.created_by = up.id;

-- View for low stock items (items where stock_qty <= low_stock_warning)
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
    ii.*,
    up_creator.full_name as creator_name,
    up_updater.full_name as updater_name
FROM inventory_items ii
LEFT JOIN user_profiles up_creator ON ii.created_by = up_creator.id
LEFT JOIN user_profiles up_updater ON ii.updated_by = up_updater.id
WHERE ii.stock_qty <= ii.low_stock_warning;

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Inventory items policies
CREATE POLICY "Authenticated users can view all inventory items" ON inventory_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert inventory items" ON inventory_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update inventory items" ON inventory_items
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete inventory items" ON inventory_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Stock transactions policies
CREATE POLICY "Authenticated users can view all stock transactions" ON stock_transactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert stock transactions" ON stock_transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Reservations policies
CREATE POLICY "Authenticated users can view all reservations" ON reservations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert reservations" ON reservations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update reservations" ON reservations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete reservations" ON reservations
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 10. TRIGGERS FOR AUTOMATIC RESERVED QUANTITY UPDATES
-- =====================================================

-- Function to update reserved quantity when reservations change
CREATE OR REPLACE FUNCTION update_item_reserved_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        -- Only update if status is active
        IF NEW.status = 'active' THEN
            UPDATE inventory_items
            SET reserved_quantity = reserved_quantity + NEW.reserved_quantity
            WHERE id = NEW.item_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- If status changed from active to something else
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE inventory_items
            SET reserved_quantity = reserved_quantity - OLD.reserved_quantity
            WHERE id = OLD.item_id;
        -- If status changed from something else to active
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE inventory_items
            SET reserved_quantity = reserved_quantity + NEW.reserved_quantity
            WHERE id = NEW.item_id;
        -- If quantity changed and status is active
        ELSIF OLD.status = 'active' AND NEW.status = 'active' AND OLD.reserved_quantity != NEW.reserved_quantity THEN
            UPDATE inventory_items
            SET reserved_quantity = reserved_quantity - OLD.reserved_quantity + NEW.reserved_quantity
            WHERE id = NEW.item_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        -- Only update if status was active
        IF OLD.status = 'active' THEN
            UPDATE inventory_items
            SET reserved_quantity = reserved_quantity - OLD.reserved_quantity
            WHERE id = OLD.item_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to reservations table
CREATE TRIGGER update_reserved_quantity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_item_reserved_quantity();

-- =====================================================
-- 11. FUNCTION TO CREATE USER PROFILE ON SIGNUP
-- =====================================================

-- Function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 12. SAMPLE DATA (OPTIONAL - COMMENT OUT IF NOT NEEDED)
-- =====================================================

-- Uncomment the following section if you want to insert sample data

/*
-- Insert sample user profile (replace with actual user ID from auth.users)
INSERT INTO user_profiles (id, email, full_name) VALUES 
('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'Admin User')
ON CONFLICT (id) DO NOTHING;

-- Insert sample inventory items
INSERT INTO inventory_items (item_name, item_brand, size, stock_qty, low_stock_warning, remark, created_by, updated_by) VALUES 
('Sample Item 1', 'Brand A', 'Large', 50, 10, 'Sample item for testing', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),
('Sample Item 2', 'Brand B', 'Medium', 25, 5, 'Another sample item', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Inventory Manager database schema created successfully!';
    RAISE NOTICE 'Tables created: user_profiles, inventory_items, stock_transactions, reservations';
    RAISE NOTICE 'Views created: inventory_items_with_users, stock_transactions_with_users, reservations_with_details, reservations_with_users, low_stock_items';
    RAISE NOTICE 'Functions created: recompute_reserved_quantity, check_available_stock, handle_new_user, update_item_reserved_quantity';
    RAISE NOTICE 'RLS policies enabled on all tables';
    RAISE NOTICE 'Triggers configured for automatic timestamp and reserved quantity updates';
END $$;
