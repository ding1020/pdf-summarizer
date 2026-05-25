#!/usr/bin/env node

/**
 * 配置检查脚本
 * 运行: npx tsx scripts/check-config.ts
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const envFiles = [
  '.env.local',
  '.env.production',
  '.env'
];

const requiredVars = {
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': 'Clerk 认证公钥',
  'CLERK_SECRET_KEY': 'Clerk 认证密钥',
  'DATABASE_URL': '数据库连接',
  'GROQ_API_KEY': 'Groq AI 密钥',
  'PADDLE_VENDOR_ID': 'Paddle 商户 ID',
  'PADDLE_SECRET_KEY': 'Paddle API 密钥',
  'PADDLE_WEBHOOK_SECRET': 'Paddle Webhook 密钥',
  'PADDLE_PRICE_ID': 'Paddle 月付价格 ID',
};

const optionalVars = {
  'DEEPSEEK_API_KEY': 'DeepSeek AI 密钥 (可选)',
  'SILICONFLOW_API_KEY': 'SiliconFlow 密钥 (可选)',
  'NEXT_PUBLIC_SENTRY_DSN': 'Sentry 监控 (可选)',
};

function checkConfig() {
  console.log('\n🔍 PDF Summarizer 配置检查\n');
  console.log('=' .repeat(50));

  // 读取环境变量
  let envContent = '';
  let foundEnvFile = false;

  for (const envFile of envFiles) {
    const envPath = resolve(process.cwd(), envFile);
    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf-8');
      foundEnvFile = true;
      console.log(`\n✅ 找到配置文件: ${envFile}`);
      break;
    }
  }

  if (!foundEnvFile) {
    console.log('\n❌ 未找到环境配置文件!');
    console.log('请复制 .env.local.example 为 .env.local 并配置');
    console.log('\n命令: cp .env.local.example .env.local');
    return false;
  }

  // 提取环境变量
  const envVars: Record<string, string> = {};
  const varPattern = /^([A-Z_]+)=(.*)$/gm;
  let match;
  while ((match = varPattern.exec(envContent)) !== null) {
    envVars[match[1]] = match[2];
  }

  // 检查必需变量
  console.log('\n📋 必需配置检查:\n');
  let allRequired = true;

  for (const [key, label] of Object.entries(requiredVars)) {
    const value = envVars[key];
    if (value && !value.includes('REPLACE_WITH') && value.length > 10) {
      console.log(`  ✅ ${key}`);
    } else if (value?.includes('REPLACE_WITH')) {
      console.log(`  ❌ ${key} - 需要替换占位符`);
      allRequired = false;
    } else {
      console.log(`  ⚠️  ${key} - 未配置 (${label})`);
      allRequired = false;
    }
  }

  // 检查可选变量
  console.log('\n📋 可选配置检查:\n');

  for (const [key, label] of Object.entries(optionalVars)) {
    const value = envVars[key];
    if (value && !value.includes('REPLACE_WITH') && value.length > 10) {
      console.log(`  ✅ ${key}`);
    } else {
      console.log(`  ⚠️  ${key} - 未配置 (${label})`);
    }
  }

  // 检查至少一个 AI 提供商
  console.log('\n📋 AI 提供商检查:\n');
  const aiProviders = ['GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'SILICONFLOW_API_KEY', 'OPENAI_API_KEY'];
  const hasAIProvider = aiProviders.some(key => {
    const value = envVars[key];
    return value && !value.includes('REPLACE_WITH') && value.length > 10;
  });

  if (hasAIProvider) {
    console.log('  ✅ 至少配置了一个 AI 提供商');
  } else {
    console.log('  ❌ 未配置任何 AI 提供商!');
    console.log('  请至少配置 GROQ_API_KEY (推荐)');
    allRequired = false;
  }

  // 检查 Paddle 配置
  console.log('\n📋 Paddle 支付检查:\n');
  const paddleConfigured = envVars['PADDLE_PRICE_ID'] && 
                          !envVars['PADDLE_PRICE_ID'].includes('REPLACE_WITH');
  
  if (paddleConfigured) {
    console.log('  ✅ Paddle 已配置');
    console.log(`  环境: ${envVars['PADDLE_ENV'] || 'sandbox'}`);
  } else {
    console.log('  ⚠️  Paddle 未完整配置 (支付功能不可用)');
  }

  // 总结
  console.log('\n' + '=' .repeat(50));
  
  if (allRequired) {
    console.log('\n✅ 配置检查通过!');
    console.log('下一步:');
    console.log('  1. 运行: npm run dev');
    console.log('  2. 访问: http://localhost:3000/paddle-setup 验证配置');
    console.log('  3. 测试注册/登录功能\n');
    return true;
  } else {
    console.log('\n⚠️  配置不完整');
    console.log('请完成上述未通过的配置项后重新检查\n');
    return false;
  }
}

checkConfig();
