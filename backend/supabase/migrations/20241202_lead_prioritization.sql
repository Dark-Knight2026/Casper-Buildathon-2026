-- Lead Prioritization System Migration
-- Creates tables and functions for AI-powered lead scoring

BEGIN;

-- Lead Scores Table
CREATE TABLE IF NOT EXISTS app_a12f5_lead_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES auth.users NOT NULL,
    client_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    
    -- Scoring factors
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
    budget_alignment_score INTEGER DEFAULT 0 CHECK (budget_alignment_score BETWEEN 0 AND 100),
    timeline_urgency_score INTEGER DEFAULT 0 CHECK (timeline_urgency_score BETWEEN 0 AND 100),
    response_rate_score INTEGER DEFAULT 0 CHECK (response_rate_score BETWEEN 0 AND 100),
    property_match_score INTEGER DEFAULT 0 CHECK (property_match_score BETWEEN 0 AND 100),
    
    -- Overall score (weighted average)
    overall_score INTEGER DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('critical', 'high', 'medium', 'low')),
    
    -- Lead details
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    desired_timeline TEXT, -- 'immediate', 'within_month', 'within_quarter', 'flexible'
    property_preferences JSONB DEFAULT '{}',
    
    -- Engagement metrics
    total_interactions INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    days_since_last_contact INTEGER DEFAULT 0,
    email_opens INTEGER DEFAULT 0,
    email_clicks INTEGER DEFAULT 0,
    property_views INTEGER DEFAULT 0,
    showings_attended INTEGER DEFAULT 0,
    
    -- AI insights
    ai_recommendations TEXT,
    next_best_action TEXT,
    predicted_conversion_probability INTEGER CHECK (predicted_conversion_probability BETWEEN 0 AND 100),
    
    -- Status tracking
    lead_status TEXT DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'nurturing', 'hot', 'cold', 'converted', 'lost')),
    lead_source TEXT,
    tags TEXT[],
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    score_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_scores_agent ON app_a12f5_lead_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_overall ON app_a12f5_lead_scores(agent_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scores_priority ON app_a12f5_lead_scores(agent_id, priority_level);
CREATE INDEX IF NOT EXISTS idx_lead_scores_status ON app_a12f5_lead_scores(agent_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_lead_scores_updated ON app_a12f5_lead_scores(agent_id, updated_at DESC);

-- Lead Interaction History Table
CREATE TABLE IF NOT EXISTS app_a12f5_lead_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_score_id UUID REFERENCES app_a12f5_lead_scores(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES auth.users NOT NULL,
    
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'email_sent', 'email_opened', 'email_clicked', 'email_replied',
        'call_made', 'call_received', 'voicemail_left',
        'text_sent', 'text_received',
        'property_viewed', 'showing_scheduled', 'showing_attended', 'showing_cancelled',
        'meeting_scheduled', 'meeting_completed',
        'offer_discussed', 'document_signed',
        'note_added', 'status_changed'
    )),
    
    interaction_details JSONB DEFAULT '{}',
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead ON app_a12f5_lead_interactions(lead_score_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_agent ON app_a12f5_lead_interactions(agent_id, created_at DESC);

-- Row Level Security
ALTER TABLE app_a12f5_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_a12f5_lead_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_scores
CREATE POLICY "Agents can view their own lead scores"
    ON app_a12f5_lead_scores FOR SELECT
    USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert their own lead scores"
    ON app_a12f5_lead_scores FOR INSERT
    WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own lead scores"
    ON app_a12f5_lead_scores FOR UPDATE
    USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own lead scores"
    ON app_a12f5_lead_scores FOR DELETE
    USING (auth.uid() = agent_id);

-- RLS Policies for lead_interactions
CREATE POLICY "Agents can view their own lead interactions"
    ON app_a12f5_lead_interactions FOR SELECT
    USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert their own lead interactions"
    ON app_a12f5_lead_interactions FOR INSERT
    WITH CHECK (auth.uid() = agent_id);

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(
    p_engagement_score INTEGER,
    p_budget_alignment_score INTEGER,
    p_timeline_urgency_score INTEGER,
    p_response_rate_score INTEGER,
    p_property_match_score INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_weighted_score DECIMAL;
BEGIN
    -- Weighted average calculation
    -- Weights: engagement(25%), budget(20%), timeline(20%), response(20%), property_match(15%)
    v_weighted_score := (
        (p_engagement_score * 0.25) +
        (p_budget_alignment_score * 0.20) +
        (p_timeline_urgency_score * 0.20) +
        (p_response_rate_score * 0.20) +
        (p_property_match_score * 0.15)
    );
    
    RETURN ROUND(v_weighted_score)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine priority level
CREATE OR REPLACE FUNCTION determine_priority_level(p_overall_score INTEGER)
RETURNS TEXT AS $$
BEGIN
    CASE
        WHEN p_overall_score >= 80 THEN RETURN 'critical';
        WHEN p_overall_score >= 60 THEN RETURN 'high';
        WHEN p_overall_score >= 40 THEN RETURN 'medium';
        ELSE RETURN 'low';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update lead score automatically
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate overall score
    NEW.overall_score := calculate_lead_score(
        NEW.engagement_score,
        NEW.budget_alignment_score,
        NEW.timeline_urgency_score,
        NEW.response_rate_score,
        NEW.property_match_score
    );
    
    -- Determine priority level
    NEW.priority_level := determine_priority_level(NEW.overall_score);
    
    -- Update timestamps
    NEW.updated_at := TIMEZONE('utc'::text, NOW());
    NEW.score_calculated_at := TIMEZONE('utc'::text, NOW());
    
    -- Calculate days since last contact
    IF NEW.last_interaction_at IS NOT NULL THEN
        NEW.days_since_last_contact := EXTRACT(DAY FROM (NOW() - NEW.last_interaction_at))::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update scores
CREATE TRIGGER trigger_update_lead_score
    BEFORE INSERT OR UPDATE ON app_a12f5_lead_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_score();

-- Function to get prioritized leads for an agent
CREATE OR REPLACE FUNCTION get_prioritized_leads(
    p_agent_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    lead_id UUID,
    client_name TEXT,
    overall_score INTEGER,
    priority_level TEXT,
    lead_status TEXT,
    days_since_last_contact INTEGER,
    next_best_action TEXT,
    predicted_conversion_probability INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ls.id,
        ls.client_name,
        ls.overall_score,
        ls.priority_level,
        ls.lead_status,
        ls.days_since_last_contact,
        ls.next_best_action,
        ls.predicted_conversion_probability
    FROM app_a12f5_lead_scores ls
    WHERE ls.agent_id = p_agent_id
        AND ls.lead_status NOT IN ('converted', 'lost')
    ORDER BY
        CASE ls.priority_level
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        ls.overall_score DESC,
        ls.days_since_last_contact DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get lead analytics summary
CREATE OR REPLACE FUNCTION get_lead_analytics(p_agent_id UUID)
RETURNS TABLE (
    total_leads INTEGER,
    critical_leads INTEGER,
    high_priority_leads INTEGER,
    medium_priority_leads INTEGER,
    low_priority_leads INTEGER,
    avg_overall_score DECIMAL,
    hot_leads INTEGER,
    cold_leads INTEGER,
    avg_days_to_contact DECIMAL,
    total_interactions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_leads,
        COUNT(*) FILTER (WHERE priority_level = 'critical')::INTEGER AS critical_leads,
        COUNT(*) FILTER (WHERE priority_level = 'high')::INTEGER AS high_priority_leads,
        COUNT(*) FILTER (WHERE priority_level = 'medium')::INTEGER AS medium_priority_leads,
        COUNT(*) FILTER (WHERE priority_level = 'low')::INTEGER AS low_priority_leads,
        ROUND(AVG(overall_score), 1) AS avg_overall_score,
        COUNT(*) FILTER (WHERE lead_status = 'hot')::INTEGER AS hot_leads,
        COUNT(*) FILTER (WHERE lead_status = 'cold')::INTEGER AS cold_leads,
        ROUND(AVG(days_since_last_contact), 1) AS avg_days_to_contact,
        SUM(total_interactions)::INTEGER AS total_interactions
    FROM app_a12f5_lead_scores
    WHERE agent_id = p_agent_id
        AND lead_status NOT IN ('converted', 'lost');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to record interaction and update scores
CREATE OR REPLACE FUNCTION record_lead_interaction(
    p_lead_score_id UUID,
    p_agent_id UUID,
    p_interaction_type TEXT,
    p_interaction_details JSONB DEFAULT '{}',
    p_sentiment TEXT DEFAULT 'neutral',
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_interaction_id UUID;
    v_engagement_boost INTEGER := 0;
    v_response_boost INTEGER := 0;
BEGIN
    -- Insert interaction record
    INSERT INTO app_a12f5_lead_interactions (
        lead_score_id,
        agent_id,
        interaction_type,
        interaction_details,
        sentiment,
        notes
    ) VALUES (
        p_lead_score_id,
        p_agent_id,
        p_interaction_type,
        p_interaction_details,
        p_sentiment,
        p_notes
    ) RETURNING id INTO v_interaction_id;
    
    -- Calculate score boosts based on interaction type
    CASE p_interaction_type
        WHEN 'email_opened' THEN v_engagement_boost := 2;
        WHEN 'email_clicked' THEN v_engagement_boost := 5;
        WHEN 'email_replied' THEN v_engagement_boost := 10; v_response_boost := 15;
        WHEN 'call_received' THEN v_engagement_boost := 15; v_response_boost := 20;
        WHEN 'property_viewed' THEN v_engagement_boost := 8;
        WHEN 'showing_attended' THEN v_engagement_boost := 20; v_response_boost := 25;
        WHEN 'meeting_completed' THEN v_engagement_boost := 25; v_response_boost := 30;
        ELSE v_engagement_boost := 1;
    END CASE;
    
    -- Update lead scores
    UPDATE app_a12f5_lead_scores
    SET
        total_interactions = total_interactions + 1,
        last_interaction_at = NOW(),
        engagement_score = LEAST(100, engagement_score + v_engagement_boost),
        response_rate_score = LEAST(100, response_rate_score + v_response_boost),
        email_opens = CASE WHEN p_interaction_type = 'email_opened' THEN email_opens + 1 ELSE email_opens END,
        email_clicks = CASE WHEN p_interaction_type = 'email_clicked' THEN email_clicks + 1 ELSE email_clicks END,
        property_views = CASE WHEN p_interaction_type = 'property_viewed' THEN property_views + 1 ELSE property_views END,
        showings_attended = CASE WHEN p_interaction_type = 'showing_attended' THEN showings_attended + 1 ELSE showings_attended END
    WHERE id = p_lead_score_id;
    
    RETURN v_interaction_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;