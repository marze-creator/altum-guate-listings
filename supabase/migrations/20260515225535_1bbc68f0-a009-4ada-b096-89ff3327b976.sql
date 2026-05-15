
-- =============== ENUMS ===============
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor', 'cliente');
CREATE TYPE public.property_status AS ENUM ('draft', 'pending', 'published', 'rejected', 'sold', 'rented');
CREATE TYPE public.property_operation AS ENUM ('venta', 'renta');
CREATE TYPE public.property_type AS ENUM ('casa', 'apartamento', 'terreno', 'oficina', 'local', 'finca');

-- =============== PROFILES ===============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============== USER ROLES ===============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- =============== PROPERTIES ===============
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  price NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GTQ',
  operation property_operation NOT NULL,
  type property_type NOT NULL,
  zone TEXT NOT NULL,
  city TEXT,
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  bedrooms INT DEFAULT 0,
  bathrooms NUMERIC(4,1) DEFAULT 0,
  area_m2 NUMERIC(10,2),
  parking INT DEFAULT 0,
  year_built INT,
  features TEXT[] DEFAULT '{}',
  cover_image TEXT,
  status property_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_owner ON public.properties(owner_id);
CREATE INDEX idx_properties_zone ON public.properties(zone);
CREATE INDEX idx_properties_operation ON public.properties(operation);

-- =============== PROPERTY IMAGES ===============
CREATE TABLE public.property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_property_images_property ON public.property_images(property_id);

-- =============== INQUIRIES ===============
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  contacted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inquiries_property ON public.inquiries(property_id);

-- =============== updated_at trigger ===============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== auto-create profile ===============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  -- default role: cliente
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============== set published_at ===============
CREATE OR REPLACE FUNCTION public.set_published_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_set_published_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_published_at();

-- =============== RLS POLICIES ===============

-- profiles: visible para todos (info pública del agente), pero solo dueño edita
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- user_roles: usuarios ven sus roles; admins ven y gestionan todos
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- properties
CREATE POLICY "Anyone views published" ON public.properties FOR SELECT USING (status = 'published');
CREATE POLICY "Owners view own properties" ON public.properties FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Admins view all properties" ON public.properties FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendedores create properties" ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND (public.has_role(auth.uid(), 'vendedor') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Owners update own properties" ON public.properties FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Admins update any property" ON public.properties FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete own properties" ON public.properties FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Admins delete any property" ON public.properties FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- property_images: visibles si la propiedad es visible
CREATE POLICY "Images viewable on published" ON public.property_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published'));
CREATE POLICY "Owners view own images" ON public.property_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "Admins view all images" ON public.property_images FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners manage own images" ON public.property_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "Admins manage all images" ON public.property_images FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- inquiries: cualquiera crea; vendedor ve las suyas; admin ve todas
CREATE POLICY "Anyone creates inquiries" ON public.inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners view inquiries" ON public.inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "Admins view all inquiries" ON public.inquiries FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners update inquiries" ON public.inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "Admins update inquiries" ON public.inquiries FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- =============== STORAGE BUCKET ===============
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Property images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');
CREATE POLICY "Authenticated upload property images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own property images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own property images" ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
