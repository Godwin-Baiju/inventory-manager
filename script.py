import uuid
from datetime import datetime
import random
from faker import Faker

def generate_sql_queries(n=10):
    fake = Faker()
    queries = []
    
    # Fixed UUID for created_by / updated_by
    fixed_user_id = "ebaba906-671a-4dda-8ce7-676171a692dd"
    
    for _ in range(n):
        item_id = str(uuid.uuid4())
        item_name = fake.word().capitalize() + " Item"
        item_brand = fake.company()
        size = f"{random.randint(100, 1000)}mm x {random.randint(100, 1000)}mm"
        stock_qty = random.randint(1, 1000)
        remark = fake.sentence(nb_words=5)
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f+00')
        reserved_qty = random.randint(0, stock_qty // 2)
        low_stock_warning = random.randint(10, 100)

        query = f"""
        INSERT INTO "public"."inventory_items" 
        ("id", "item_name", "item_brand", "size", "stock_qty", "remark", 
        "created_at", "updated_at", "created_by", "updated_by", 
        "reserved_quantity", "low_stock_warning") 
        VALUES 
        ('{item_id}', '{item_name}', '{item_brand}', '{size}', '{stock_qty}', '{remark}', 
        '{timestamp}', '{timestamp}', '{fixed_user_id}', '{fixed_user_id}', 
        '{reserved_qty}', '{low_stock_warning}');
        """
        queries.append(query.strip())
    
    return queries


if __name__ == "__main__":
    n = 1000  # change this number to however many queries you need
    sql_queries = generate_sql_queries(n)
    for q in sql_queries:
        print(q, "\n")
