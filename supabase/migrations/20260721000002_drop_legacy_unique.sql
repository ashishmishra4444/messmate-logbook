DO $$
DECLARE
    con_name text;
BEGIN
    SELECT constraint_name INTO con_name 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
      AND table_name = 'attendance' 
      AND constraint_type = 'UNIQUE' 
      AND constraint_name LIKE '%date%'; 
      
    IF con_name IS NOT NULL THEN 
        EXECUTE 'ALTER TABLE public.attendance DROP CONSTRAINT ' || quote_ident(con_name); 
    END IF;
END $$;
