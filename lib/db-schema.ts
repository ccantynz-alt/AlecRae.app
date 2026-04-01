import { query } from './db';

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE,
      name VARCHAR(255),
      password_hash VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      firm_name VARCHAR(255),
      firm_id UUID,
      subscription_tier VARCHAR(50) DEFAULT 'free',
      subscription_status VARCHAR(50) DEFAULT 'active',
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      sso_provider VARCHAR(100),
      sso_subject VARCHAR(255),
      custom_instructions TEXT DEFAULT '',
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS dictations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      raw_text TEXT NOT NULL,
      enhanced_text TEXT,
      mode VARCHAR(50) NOT NULL,
      audio_url TEXT,
      audio_duration FLOAT,
      word_count INT,
      is_batch BOOLEAN DEFAULT FALSE,
      template_id UUID,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      term VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, term)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS firms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE,
      ai_instructions TEXT DEFAULT '',
      vocabulary TEXT[] DEFAULT '{}',
      branding JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      mode VARCHAR(50) NOT NULL,
      fields JSONB NOT NULL DEFAULT '[]',
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_dictations_user ON dictations(user_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_vocabulary_user ON vocabulary(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_templates_firm ON templates(firm_id)`);
}
