-- Create Biases table
CREATE TABLE IF NOT EXISTS public.biases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    full_name TEXT,
    group_name TEXT,
    age INTEGER,
    trending_song TEXT,
    position TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.biases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own biases" 
ON public.biases FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biases" 
ON public.biases FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biases" 
ON public.biases FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biases" 
ON public.biases FOR DELETE 
USING (auth.uid() = user_id);
