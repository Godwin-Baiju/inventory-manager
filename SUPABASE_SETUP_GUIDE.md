# Supabase Backend Setup Guide

This guide will help you recreate the complete Supabase backend for your inventory manager project.

## Prerequisites

1. A Supabase project (create one at [supabase.com](https://supabase.com))
2. Access to your Supabase project dashboard
3. Your project URL and anon key (found in Project Settings > API)

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **"New Query"** to create a new SQL script

## Step 2: Run the Schema Script

1. Copy the entire contents of `supabase_schema.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** to execute the script

The script will create:
- ✅ 4 main tables (user_profiles, inventory_items, stock_transactions, reservations)
- ✅ All necessary indexes for performance
- ✅ Views for common queries with user information
- ✅ Functions for business logic
- ✅ Triggers for automatic updates
- ✅ Row Level Security (RLS) policies
- ✅ Automatic user profile creation on signup

## Step 3: Verify the Setup

After running the script, verify that everything was created correctly:

### Check Tables
```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Check Views
```sql
-- List all views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Check Functions
```sql
-- List all functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

## Step 4: Test the Setup

### Test User Profile Creation
```sql
-- This should work after a user signs up
SELECT * FROM user_profiles LIMIT 5;
```

### Test Inventory Operations
```sql
-- Insert a test item (replace user_id with actual user ID)
INSERT INTO inventory_items (item_name, item_brand, size, stock_qty, low_stock_warning, created_by, updated_by)
VALUES ('Test Item', 'Test Brand', 'Large', 100, 10, auth.uid(), auth.uid());

-- Check the item was created
SELECT * FROM inventory_items_with_users;
```

### Test Stock Transaction
```sql
-- Create a stock transaction
INSERT INTO stock_transactions (item_id, transaction_type, quantity, previous_stock, new_stock, reason, created_by)
SELECT 
    id, 
    'in', 
    50, 
    0, 
    50, 
    'Initial stock', 
    auth.uid()
FROM inventory_items 
WHERE item_name = 'Test Item' 
LIMIT 1;

-- Check the transaction
SELECT * FROM stock_transactions_with_users;
```

## Step 5: Environment Variables

Make sure your `.env.local` file has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Schema Overview

### Tables Created

1. **user_profiles** - User profile information
   - Links to auth.users
   - Stores email, full_name, timestamps

2. **inventory_items** - Main inventory items
   - item_name, item_brand, size
   - stock_qty, reserved_quantity, low_stock_warning
   - remark, timestamps, created_by, updated_by

3. **stock_transactions** - All stock movements
   - Links to inventory_items
   - transaction_type (in/out), quantity
   - previous_stock, new_stock, reason
   - created_at, created_by

4. **reservations** - Item reservations
   - Links to inventory_items
   - party_name, party_contact, party_address
   - reserved_quantity, reserved_until, notes
   - status (active/fulfilled/cancelled)

### Views Created

1. **inventory_items_with_users** - Items with creator/updater names
2. **stock_transactions_with_users** - Transactions with user names
3. **reservations_with_details** - Reservations with user and item details
4. **reservations_with_users** - Reservations with user names (for compatibility)
5. **low_stock_items** - Items that are at or below their warning threshold

### Functions Created

1. **recompute_reserved_quantity(p_item_id)** - Recalculates reserved quantity
2. **check_available_stock(p_item_id, p_quantity)** - Checks if stock is available
3. **handle_new_user()** - Creates user profile on signup
4. **update_item_reserved_quantity()** - Updates reserved quantity automatically

### Triggers Created

1. **update_updated_at_column** - Updates timestamps automatically
2. **update_reserved_quantity_trigger** - Updates reserved quantity when reservations change
3. **on_auth_user_created** - Creates user profile on signup

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Policies** allow authenticated users to perform CRUD operations
- **User isolation** through proper foreign key relationships
- **Automatic user profile creation** on signup

## Performance Optimizations

- **Indexes** on frequently queried columns
- **Views** for common join operations
- **Efficient queries** with proper foreign key relationships

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure RLS policies are correctly set up
2. **Foreign Key Errors**: Ensure user IDs exist in auth.users
3. **Trigger Errors**: Check that functions are created before triggers

### Reset Everything (if needed)
```sql
-- WARNING: This will delete all data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then re-run the schema script.

## Next Steps

1. ✅ Run the schema script in Supabase SQL Editor
2. ✅ Verify tables, views, and functions are created
3. ✅ Test with sample data
4. ✅ Update your environment variables
5. ✅ Test your Next.js application

Your inventory manager backend should now be fully functional!
