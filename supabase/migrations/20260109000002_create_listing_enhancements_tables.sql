-- Create listing_photos table
CREATE TABLE IF NOT EXISTS listing_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  uploaded_by UUID REFERENCES auth.users,
  metadata JSONB,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create listing_virtual_tours table
CREATE TABLE IF NOT EXISTS listing_virtual_tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('matterport', 'zillow_3d', 'youtube', 'custom')),
  url TEXT NOT NULL,
  embed_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create listing_floor_plans table
CREATE TABLE IF NOT EXISTS listing_floor_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  level TEXT,
  square_footage INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create listing_templates table
CREATE TABLE IF NOT EXISTS listing_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL,
  template_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0
);

-- Create listing_price_history table
CREATE TABLE IF NOT EXISTS listing_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  old_price DECIMAL(12, 2) NOT NULL,
  new_price DECIMAL(12, 2) NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES auth.users NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create listing_views table
CREATE TABLE IF NOT EXISTS listing_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users,
  source TEXT NOT NULL DEFAULT 'direct',
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create listing_analytics table
CREATE TABLE IF NOT EXISTS listing_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL UNIQUE,
  total_views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  average_time_on_page INTEGER DEFAULT 0,
  inquiries INTEGER DEFAULT 0,
  showing_requests INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  traffic_sources JSONB DEFAULT '[]'::jsonb,
  views_by_day JSONB DEFAULT '[]'::jsonb,
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create listing_inquiries table
CREATE TABLE IF NOT EXISTS listing_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  inquirer_name TEXT NOT NULL,
  inquirer_email TEXT NOT NULL,
  inquirer_phone TEXT,
  message TEXT NOT NULL,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('general', 'showing', 'offer', 'financing')),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'showing_scheduled', 'closed', 'lost')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  score INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  notes JSONB DEFAULT '[]'::jsonb,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create showing_requests table
CREATE TABLE IF NOT EXISTS showing_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  requested_by TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  requested_by_phone TEXT,
  preferred_date TIMESTAMP WITH TIME ZONE NOT NULL,
  preferred_time TEXT NOT NULL,
  alternate_date TIMESTAMP WITH TIME ZONE,
  alternate_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  confirmed_date TIMESTAMP WITH TIME ZONE,
  confirmed_time TEXT,
  notes TEXT,
  feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create listing_documents table
CREATE TABLE IF NOT EXISTS listing_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('listing_agreement', 'disclosure', 'inspection', 'appraisal', 'title', 'hoa', 'other')),
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  requires_signature BOOLEAN DEFAULT false,
  signature_status TEXT CHECK (signature_status IN ('pending', 'signed', 'declined')),
  version INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT false,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create listing_collaborators table
CREATE TABLE IF NOT EXISTS listing_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'co_agent', 'team_member', 'viewer')),
  permissions JSONB NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  added_by UUID REFERENCES auth.users NOT NULL,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  UNIQUE(listing_id, user_id)
);

-- Create listing_activities table
CREATE TABLE IF NOT EXISTS listing_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  metadata JSONB,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'social', 'print', 'open_house', 'virtual_tour')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  channels JSONB DEFAULT '[]'::jsonb,
  budget DECIMAL(10, 2),
  spent DECIMAL(10, 2),
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS listing_photos_listing_idx ON listing_photos(listing_id);
CREATE INDEX IF NOT EXISTS listing_photos_order_idx ON listing_photos("order");
CREATE INDEX IF NOT EXISTS listing_photos_featured_idx ON listing_photos(is_featured);

CREATE INDEX IF NOT EXISTS listing_virtual_tours_listing_idx ON listing_virtual_tours(listing_id);

CREATE INDEX IF NOT EXISTS listing_floor_plans_listing_idx ON listing_floor_plans(listing_id);

CREATE INDEX IF NOT EXISTS listing_templates_type_idx ON listing_templates(property_type);
CREATE INDEX IF NOT EXISTS listing_templates_public_idx ON listing_templates(is_public);
CREATE INDEX IF NOT EXISTS listing_templates_usage_idx ON listing_templates(usage_count DESC);

CREATE INDEX IF NOT EXISTS listing_price_history_listing_idx ON listing_price_history(listing_id);
CREATE INDEX IF NOT EXISTS listing_price_history_date_idx ON listing_price_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS listing_views_listing_idx ON listing_views(listing_id);
CREATE INDEX IF NOT EXISTS listing_views_date_idx ON listing_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS listing_views_user_idx ON listing_views(user_id);

CREATE INDEX IF NOT EXISTS listing_inquiries_listing_idx ON listing_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS listing_inquiries_status_idx ON listing_inquiries(status);
CREATE INDEX IF NOT EXISTS listing_inquiries_date_idx ON listing_inquiries(submitted_at DESC);

CREATE INDEX IF NOT EXISTS showing_requests_listing_idx ON showing_requests(listing_id);
CREATE INDEX IF NOT EXISTS showing_requests_status_idx ON showing_requests(status);
CREATE INDEX IF NOT EXISTS showing_requests_date_idx ON showing_requests(preferred_date);

CREATE INDEX IF NOT EXISTS listing_documents_listing_idx ON listing_documents(listing_id);
CREATE INDEX IF NOT EXISTS listing_documents_type_idx ON listing_documents(type);

CREATE INDEX IF NOT EXISTS listing_collaborators_listing_idx ON listing_collaborators(listing_id);
CREATE INDEX IF NOT EXISTS listing_collaborators_user_idx ON listing_collaborators(user_id);

CREATE INDEX IF NOT EXISTS listing_activities_listing_idx ON listing_activities(listing_id);
CREATE INDEX IF NOT EXISTS listing_activities_date_idx ON listing_activities(timestamp DESC);

CREATE INDEX IF NOT EXISTS marketing_campaigns_listing_idx ON marketing_campaigns(listing_id);
CREATE INDEX IF NOT EXISTS marketing_campaigns_status_idx ON marketing_campaigns(status);

-- Enable Row Level Security
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_virtual_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE showing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listing_photos
CREATE POLICY "Users can view photos of public listings"
  ON listing_photos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Agents can manage their listing photos"
  ON listing_photos FOR ALL
  TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE agent_id = auth.uid()
    )
  );

-- RLS Policies for listing_inquiries
CREATE POLICY "Anyone can submit inquiries"
  ON listing_inquiries FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Agents can view inquiries for their listings"
  ON listing_inquiries FOR SELECT
  TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update inquiries for their listings"
  ON listing_inquiries FOR UPDATE
  TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE agent_id = auth.uid()
    )
  );

-- RLS Policies for showing_requests
CREATE POLICY "Anyone can request showings"
  ON showing_requests FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Agents can view showing requests for their listings"
  ON showing_requests FOR SELECT
  TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update showing requests for their listings"
  ON showing_requests FOR UPDATE
  TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE agent_id = auth.uid()
    )
  );

-- RLS Policies for listing_templates
CREATE POLICY "Users can view public templates"
  ON listing_templates FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON listing_templates FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON listing_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for listing_collaborators
CREATE POLICY "Collaborators can view their collaborations"
  ON listing_collaborators FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR added_by = auth.uid());

-- Function to update listing analytics
CREATE OR REPLACE FUNCTION update_listing_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO listing_analytics (listing_id, total_views, unique_views)
  VALUES (NEW.listing_id, 1, 1)
  ON CONFLICT (listing_id) DO UPDATE
  SET 
    total_views = listing_analytics.total_views + 1,
    last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analytics on view
CREATE TRIGGER update_analytics_on_view
  AFTER INSERT ON listing_views
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_analytics();

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE listing_templates
  SET usage_count = usage_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log listing activities
CREATE OR REPLACE FUNCTION log_listing_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_description TEXT;
  user_name_val TEXT;
BEGIN
  -- Get user name
  SELECT name INTO user_name_val FROM auth.users WHERE id = auth.uid();
  
  -- Determine activity description based on operation
  IF TG_OP = 'INSERT' THEN
    activity_description := 'Created listing';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      activity_description := 'Changed status from ' || OLD.status || ' to ' || NEW.status;
    ELSIF OLD.price != NEW.price THEN
      activity_description := 'Changed price from $' || OLD.price || ' to $' || NEW.price;
    ELSE
      activity_description := 'Updated listing';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    activity_description := 'Deleted listing';
  END IF;
  
  -- Insert activity log
  INSERT INTO listing_activities (
    listing_id,
    user_id,
    user_name,
    action,
    description
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    user_name_val,
    TG_OP,
    activity_description
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;