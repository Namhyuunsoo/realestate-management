# 부동산 관리 시스템 v2 - 구현 계획서

## 1. 프로젝트 개요

### 1.1 기술 스택
```
Frontend:    Next.js 15 (App Router) + TypeScript + Tailwind CSS
Backend:     Next.js API Routes + Server Actions
Database:    Supabase (PostgreSQL + Auth + Storage + Realtime)
AI:          Vercel AI SDK (GLM-4 / GLM-4-Plus 연동)
Hosting:     Vercel (Pro Plan 권장)
```

### 1.2 디렉토리 구조
```
realestate-v2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 인증 관련 페이지
│   │   │   ├── login/page.tsx
│   │   │   └── callback/route.ts
│   │   ├── (dashboard)/        # 대시보드
│   │   │   ├── page.tsx
│   │   │   ├── customers/
│   │   │   ├── listings/
│   │   │   └── briefings/
│   │   ├── api/                # API Routes
│   │   │   ├── customers/
│   │   │   ├── listings/
│   │   │   ├── briefings/
│   │   │   ├── recommendations/
│   │   │   └── ai/
│   │   ├── actions/             # Server Actions
│   │   │   ├── auth.ts
│   │   │   ├── customers.ts
│   │   │   └── listings.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/             # React 컴포넌트
│   │   ├── ui/                  # shadcn/ui 컴포넌트
│   │   ├── maps/                # 네이버 지도 컴포넌트
│   │   ├── listings/            # 매물 관련 컴포넌트
│   │   └── customers/           # 고객 관련 컴포넌트
│   ├── lib/                    # 유틸리티
│   │   ├── supabase/            # Supabase 클라이언트
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── types.ts
│   │   ├── ai/                  # AI 유틸리티
│   │   │   └── glm.ts
│   │   └── utils.ts
│   ├── hooks/                   # Custom Hooks
│   │   ├── use-auth.ts
│   │   ├── use-listings.ts
│   │   └── use-realtime.ts
│   └── types/                   # TypeScript 타입 정의
│       ├── database.ts
│       └── api.ts
├── supabase/                   # Supabase 설정
│   ├── migrations/             # DB 마이그레이션
│   └── seed.sql
├── public/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. 데이터베이스 설계 (Supabase)

### 2.1 테이블 구조

```sql
-- 사용자 (Supabase Auth와 연동)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  job_title TEXT DEFAULT '',
  manager_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 고객
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  region TEXT DEFAULT '',
  region2 TEXT DEFAULT '',
  manager TEXT DEFAULT '',
  note TEXT DEFAULT '',
  note2 TEXT DEFAULT '',
  note3 TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상가 매물 (임대차)
CREATE TABLE commercial_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id TEXT,
  address_full TEXT NOT NULL,
  address_comp JSONB DEFAULT '{}',
  coords JSONB DEFAULT '{"lat": null, "lng": null}',
  fields JSONB DEFAULT '{}',
  numeric_cache JSONB DEFAULT '{}',
  status_raw TEXT DEFAULT '생',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상가 매물 (구분상가매매)
CREATE TABLE commercial_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id TEXT,
  address_full TEXT NOT NULL,
  address_comp JSONB DEFAULT '{}',
  coords JSONB DEFAULT '{"lat": null, "lng": null}',
  fields JSONB DEFAULT '{}',
  numeric_cache JSONB DEFAULT '{}',
  status_raw TEXT DEFAULT '생',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상가 매물 (건물토지매매)
CREATE TABLE commercial_lands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id TEXT,
  address_full TEXT NOT NULL,
  address_comp JSONB DEFAULT '{}',
  coords JSONB DEFAULT '{"lat": null, "lng": null}',
  fields JSONB DEFAULT '{}',
  numeric_cache JSONB DEFAULT '{}',
  status_raw TEXT DEFAULT '생',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 주택 매물 (매매)
CREATE TABLE housing_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_full TEXT NOT NULL,
  address_comp JSONB DEFAULT '{}',
  coords JSONB DEFAULT '{"lat": null, "lng": null}',
  fields JSONB DEFAULT '{}',
  numeric_cache JSONB DEFAULT '{}',
  status_raw TEXT DEFAULT '생',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 주택 매물 (임대차)
CREATE TABLE housing_rents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_full TEXT NOT NULL,
  address_comp JSONB DEFAULT '{}',
  coords JSONB DEFAULT '{"lat": null, "lng": null}',
  fields JSONB DEFAULT '{}',
  numeric_cache JSONB DEFAULT '{}',
  status_raw TEXT DEFAULT '생',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 브리핑
CREATE TABLE briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  listing_ids UUID[] NOT NULL DEFAULT '{}',
  overrides JSONB DEFAULT '{}',
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 추천
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  listing_type TEXT NOT NULL, -- 'commercial_leases', 'housing_sales' 등
  user_id UUID REFERENCES profiles(id) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, listing_type, user_id)
);

-- 의견
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  listing_type TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 시트 슬롯 레지스트리
CREATE TABLE sheet_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  manager_name TEXT DEFAULT '공석',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 지오코딩 캐시
CREATE TABLE geocode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT UNIQUE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 매물 사진
CREATE TABLE listing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  listing_type TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_region ON customers(region);
CREATE INDEX idx_briefings_user ON briefings(user_id);
CREATE INDEX idx_briefings_customer ON briefings(customer_id);
CREATE INDEX idx_recommendations_listing ON recommendations(listing_id, listing_type);
CREATE INDEX idx_coords_leases ON commercial_leases USING GIN (coords);
CREATE INDEX idx_coords_units ON commercial_units USING GIN (coords);
CREATE INDEX idx_coords_lands ON commercial_lands USING GIN (coords);
```

### 2.2 Row Level Security (RLS)

```sql
-- 사용자 프로필
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 고객
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all customers"
  ON customers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 매물 (모든 사용자 조회 가능, 수정은 권한별)
ALTER TABLE commercial_leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view listings"
  ON commercial_leases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can modify listings"
  ON commercial_leases FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 3. API 설계

### 3.1 API Routes 구조

```typescript
// src/app/api/customers/route.ts
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/customers - 고객 목록
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 사용자 역할 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'
  
  // 쿼리
  let query = supabase.from('customers').select('*')
  
  if (!isAdmin) {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data, total: data.length })
}

// POST /api/customers - 고객 생성
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  
  // 유효성 검사
  if (!body.name || !body.phone) {
    return NextResponse.json({ error: 'name과 phone은 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      user_id: user.id,
      name: body.name,
      phone: body.phone,
      email: body.email,
      region: body.region,
      region2: body.region2,
      manager: body.manager,
      note: body.note
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

### 3.2 Server Actions

```typescript
// src/app/actions/customers.ts
'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const customerSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
  phone: z.string().min(10, '전화번호 형식이 올바르지 않습니다.'),
  email: z.string().email().optional().or(z.literal('')),
  region: z.string().optional(),
  region2: z.string().optional(),
  manager: z.string().optional(),
  note: z.string().optional(),
})

export async function createCustomer(formData: FormData) {
  const supabase = createServerActionClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const validated = customerSchema.parse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email') || undefined,
    region: formData.get('region') || undefined,
    region2: formData.get('region2') || undefined,
    manager: formData.get('manager') || undefined,
    note: formData.get('note') || undefined,
  })

  const { data, error } = await supabase
    .from('customers')
    .insert({ user_id: user.id, ...validated })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/customers')
  return data
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = createServerActionClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const validated = customerSchema.partial().parse(Object.fromEntries(formData))

  const { data, error } = await supabase
    .from('customers')
    .update(validated)
    .eq('id', id)
    .eq('user_id', user.id) // 본인 고객만 수정 가능
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/customers')
  return data
}

export async function deleteCustomer(id: string) {
  const supabase = createServerActionClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/customers')
}
```

---

## 4. AI 통합 (GLM-4)

### 4.1 Vercel AI SDK 설정

```typescript
// src/lib/ai/glm.ts
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'

// GLM-4 설정 (ZhipuAI 호환)
const glm = createOpenAI({
  apiKey: process.env.GLM_API_KEY,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
})

export const models = {
  'glm-4': glm('glm-4'),
  'glm-4-plus': glm('glm-4-plus'),
  'glm-4-flash': glm('glm-4-flash'),
}

// 매물 분석 프롬프트
const LISTING_ANALYSIS_SYSTEM = `당신은 부동산 전문가입니다. 
제공된 매물 정보를 분석하여 다음 정보를 요약해주세요:
1. 핵심 특징 (위치, 면적, 가격)
2. 장점 2-3가지
3. 주의사항 1-2가지
4. 추천 대상 고객 유형
간결하고 명확하게 작성해주세요.`

export async function analyzeListing(listingData: Record<string, unknown>) {
  const { text } = await generateText({
    model: models['glm-4-flash'],
    messages: [
      { role: 'system', content: LISTING_ANALYSIS_SYSTEM },
      { role: 'user', content: `다음 매물을 분석해주세요:\n\n${JSON.stringify(listingData, null, 2)}` },
    ],
  })

  return text
}

// 스트리밍 채팅
export async function chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const result = streamText({
    model: models['glm-4'],
    messages,
  })

  return result.textStream
}
```

### 4.2 AI API Route

```typescript
// src/app/api/ai/chat/route.ts
import { NextRequest } from 'next/server'
import { chat } from '@/lib/ai/glm'
import { StreamData } from 'ai'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  
  const stream = await chat(messages)
  
  // 스트리밍 응답
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
```

---

## 5. 실시간 기능 (Realtime)

### 5.1 매물 변경 구독

```typescript
// src/hooks/use-realtime.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useListingRealtime(
  table: 'commercial_leases' | 'commercial_units' | 'commercial_lands' | 'housing_sales' | 'housing_rents',
  onInsert?: (listing: any) => void,
  onUpdate?: (listing: any) => void,
  onDelete?: (id: string) => void
) {
  const supabase = createClientComponentClient()
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    const newChannel = supabase
      .channel(`listing-changes-${table}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
        },
        (payload) => onInsert?.(payload.new)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
        },
        (payload) => onUpdate?.(payload.new)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table,
        },
        (payload) => onDelete?.(payload.old.id)
      )
      .subscribe()

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [table, onInsert, onUpdate, onDelete])

  return channel
}
```

### 5.2 컴포넌트에서 사용

```typescript
// src/components/listings/ListingMap.tsx
'use client'

import { useListingRealtime } from '@/hooks/use-realtime'
import { useState, useCallback } from 'react'
import { Marker } from '@/components/maps/NaverMap'

export function ListingMap() {
  const [listings, setListings] = useState<any[]>([])

  const handleInsert = useCallback((newListing: any) => {
    setListings(prev => [...prev, newListing])
  }, [])

  const handleUpdate = useCallback((updatedListing: any) => {
    setListings(prev => 
      prev.map(l => l.id === updatedListing.id ? updatedListing : l)
    )
  }, [])

  const handleDelete = useCallback((deletedId: string) => {
    setListings(prev => prev.filter(l => l.id !== deletedId))
  }, [])

  useListingRealtime('commercial_leases', handleInsert, handleUpdate, handleDelete)

  return (
    <div className="h-[600px] rounded-lg overflow-hidden">
      <NaverMap listings={listings} />
    </div>
  )
}
```

---

## 6. 네이버 지도 API 통합

### 6.1 지도 컴포넌트

```typescript
// src/components/maps/NaverMap.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Listing } from '@/types/database'

interface NaverMapProps {
  listings: Listing[]
  center?: { lat: number; lng: number }
  zoom?: number
  onMarkerClick?: (listing: Listing) => void
}

declare global {
  interface Window {
    naver: any
  }
}

export function NaverMap({ listings, center, zoom = 14, onMarkerClick }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.naver) return

    const mapInstance = new window.naver.Map(mapRef.current, {
      center: new window.naver.LatLng(
        center?.lat ?? 37.5665,
        center?.lng ?? 126.9780
      ),
      zoom,
      mapTypeControl: true,
      zoomControl: true,
    })

    setMap(mapInstance)

    return () => {
      mapInstance.destroy()
    }
  }, [center, zoom])

  // 마커 업데이트
  useEffect(() => {
    if (!map || !window.naver) return

    // 기존 마커 제거
    markers.forEach(m => m.setMap(null))

    // 새 마커 생성
    const newMarkers = listings
      .filter(l => l.coords?.lat && l.coords?.lng)
      .map(listing => {
        const marker = new window.naver.Marker({
          position: new window.naver.LatLng(listing.coords.lat, listing.coords.lng),
          map,
          title: listing.address_full,
        })

        // 클릭 이벤트
        marker.addListener('click', () => onMarkerClick?.(listing))

        return marker
      })

    setMarkers(newMarkers)
  }, [map, listings, onMarkerClick])

  return <div ref={mapRef} className="w-full h-full" />
}

// 스크립트 로드
export function loadNaverMapScript(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.naver) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}
```

### 6.2 지오코딩 API

```typescript
// src/lib/geocoding.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const NAVER_GEOCODING_URL = 'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode'

export async function geocodeAddress(address: string) {
  // 캐시 확인
  const { data: cached } = await supabase
    .from('geocode_cache')
    .select('lat, lng')
    .eq('address', address)
    .single()

  if (cached) {
    return cached
  }

  // 네이버 API 호출
  const response = await fetch(
    `${NAVER_GEOCODING_URL}?query=${encodeURIComponent(address)}`,
    {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': process.env.NAVER_MAP_CLIENT_ID!,
        'X-NCP-APIGW-API-KEY': process.env.NAVER_MAP_CLIENT_SECRET!,
      },
    }
  )

  const data = await response.json()
  
  if (data.addresses && data.addresses.length > 0) {
    const { y: lat, x: lng } = data.addresses[0]
    
    // 캐시 저장
    await supabase
      .from('geocode_cache')
      .insert({ address, lat: parseFloat(lat), lng: parseFloat(lng) })

    return { lat: parseFloat(lat), lng: parseFloat(lng) }
  }

  throw new Error('Geocoding failed')
}

// 배치 지오코딩 (Cron용)
export async function batchGeocode(limit = 100) {
  const tables = [
    'commercial_leases',
    'commercial_units', 
    'commercial_lands',
    'housing_sales',
    'housing_rents'
  ]

  const results = { processed: 0, success: 0, failed: 0 }

  for (const table of tables) {
    // 좌표 없는 매물 조회
    const { data: listings } = await supabase
      .from(table)
      .select('id, address_full')
      .is('coords->lat', null)
      .limit(limit)

    for (const listing of listings || []) {
      try {
        const coords = await geocodeAddress(listing.address_full)
        
        await supabase
          .from(table)
          .update({ coords })
          .eq('id', listing.id)

        results.success++
      } catch (error) {
        console.error(`Geocoding failed for ${listing.id}:`, error)
        results.failed++
      }
      results.processed++
    }
  }

  return results
}
```

---

## 7. 인증 (Supabase Auth)

### 7.1 Auth Hooks

```typescript
// src/hooks/use-auth.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Profile } from '@/types/database'

export function useAuth() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        fetchProfile(user.id)
      } else {
        setLoading(false)
      }
    })

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
        
        if (event === 'SIGNED_IN') {
          router.refresh()
        }
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data)
    setLoading(false)
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = profile?.role === 'admin'
  const isManager = profile?.role === 'manager' || isAdmin

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isManager,
  }
}
```

### 7.2 Middleware

```typescript
// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 보호된 라우트
  const protectedPaths = ['/dashboard']
  const adminPaths = ['/dashboard/admin']
  
  const isProtectedPath = protectedPaths.some(p => req.nextUrl.pathname.startsWith(p))
  const isAdminPath = adminPaths.some(p => req.nextUrl.pathname.startsWith(p))

  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAdminPath && session) {
    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

---

## 8. Cron Job (Vercel Cron)

### 8.1 지오코딩 Cron

```typescript
// src/app/api/cron/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { batchGeocode } from '@/lib/geocoding'

export const maxDuration = 300 // 5분
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await batchGeocode(100)
    
    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
```

### 8.2 vercel.json 설정

```json
{
  "crons": [
    {
      "path": "/api/cron/geocode",
      "schedule": "0 */6 * * *"
    }
  ],
  "functions": {
    "src/app/api/cron/geocode/route.ts": {
      "maxDuration": 300
    }
  }
}
```

---

## 9. 구현 로드맵

### Phase 1: 기본 설정 (1주)
- [x] Next.js 15 프로젝트 생성
- [x] Supabase 프로젝트 설정
- [x] DB 스키마 마이그레이션
- [x] 인증 시스템 구현
- [x] 기본 레이아웃

### Phase 2: 핵심 기능 (2주)
- [ ] 고객 관리 CRUD
- [ ] 매물 목록 조회 + 지도
- [ ] 브리핑 시스템
- [ ] 추천/의견 시스템

### Phase 3: 고급 기능 (1주)
- [ ] AI 분석 (GLM-4)
- [ ] 실시간 업데이트
- [ ] 지오코딩 자동화
- [ ] 관리자 기능

### Phase 4: 마이그레이션 & 테스트 (1주)
- [ ] 기존 데이터 마이그레이션
- [ ] E2E 테스트
- [ ] 성능 최적화
- [ ] 배포

---

## 10. 환경 변수

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# 네이버 지도
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=xxx
NAVER_MAP_CLIENT_SECRET=xxx

# GLM AI
GLM_API_KEY=xxx

# Cron
CRON_SECRET=xxx

# 기존 DB 마이그레이션용 (일회성)
LEGACY_SUPABASE_URL=https://xxx.supabase.co
LEGACY_SUPABASE_KEY=xxx
```

---

## 11. 패키지 의존성

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "@supabase/ssr": "^0.5.0",
    "@ai-sdk/openai": "^1.0.0",
    "ai": "^4.0.0",
    "zod": "^3.23.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.460.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "prettier": "^3.3.0"
  }
}
```

---

이 계획서를 기반으로 새 프로젝트를 생성하시겠습니까?
