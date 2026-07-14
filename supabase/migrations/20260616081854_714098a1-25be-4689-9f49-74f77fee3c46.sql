
CREATE TYPE public.meal_plan AS ENUM ('lunch', 'dinner', 'both');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'not_marked');

CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  room_number TEXT NOT NULL,
  member_code TEXT,
  meal_plan public.meal_plan NOT NULL DEFAULT 'both',
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX members_name_idx ON public.members (lower(name));
CREATE INDEX members_mobile_idx ON public.members (mobile);
CREATE INDEX members_room_idx ON public.members (room_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO anon, authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to members" ON public.members FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  lunch_status public.attendance_status NOT NULL DEFAULT 'not_marked',
  dinner_status public.attendance_status NOT NULL DEFAULT 'not_marked',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, date)
);
CREATE INDEX attendance_member_date_idx ON public.attendance (member_id, date DESC);
CREATE INDEX attendance_date_idx ON public.attendance (date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO anon, authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

-- Seed sample members
INSERT INTO public.members (name, mobile, room_number, member_code, meal_plan, join_date) VALUES
('Rahul Sharma', '98765 43210', 'A-101', 'M001', 'both', '2024-01-01'),
('Aman Mishra', '91234 56789', 'A-102', 'M002', 'both', '2024-02-15'),
('Priyanshu Patel', '99887 76655', 'A-103', 'M003', 'lunch', '2024-03-10'),
('Saurav Kumar', '88991 12233', 'A-104', 'M004', 'both', '2024-01-20'),
('Nikhil Nandan', '77665 44321', 'A-105', 'M005', 'dinner', '2024-04-05'),
('Abhishek Bansal', '90909 90909', 'A-106', 'M006', 'both', '2024-02-01'),
('Aditya Verma', '12345 67890', 'A-107', 'M007', 'both', '2024-05-12'),
('Pooja Mehta', '98712 34567', 'A-108', 'M008', 'lunch', '2024-03-22'),
('Rohit Gupta', '76543 21098', 'A-109', 'M009', 'both', '2024-06-01'),
('Sneha Iyer', '90123 45678', 'A-110', 'M010', 'dinner', '2024-07-15'),
('Vikas Singh', '88776 65544', 'A-111', 'M011', 'both', '2024-01-10'),
('Megha Joshi', '99001 12345', 'A-112', 'M012', 'lunch', '2024-08-01');
