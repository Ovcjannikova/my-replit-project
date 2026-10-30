import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Check, Menu, Search, X } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { useListTires, type Tire, type TireCatalogSource } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import steeringImage from './tire-steering.png';
import driveImage from './tire-drive.png';
import trailerImage from './tire-trailer.png';

const queryClient = new QueryClient();
const EMPTY_TIRES: Tire[] = [];
const IMAGE_BY_AXLE: Record<Tire['axle'], string> = {
  рулевая: steeringImage,
  ведущая: driveImage,
  прицепная: trailerImage,
};

const normalizeSize = (value: string) => value.toUpperCase().replace(/,/g, '.').replace(/\s+/g, '');
const formatPrice = (price: number) => `${price.toLocaleString('ru-RU')} ₽`;

function ProductCard({ tire, source }: { tire: Tire; source: TireCatalogSource }) {
  const isDemo = source === 'demo';

  return (
    <article className="product-card" data-testid={`card-product-${tire.id}`}>
      <div className="product-image">
        <span className="axle-chip" data-testid={`text-axle-${tire.id}`}>{tire.axle} ось</span>
        <span className="demo-badge">{isDemo ? 'ДЕМО-ДАННЫЕ' : 'САЙТ-ИСТОЧНИК'}</span>
        <img src={tire.imageUrl || IMAGE_BY_AXLE[tire.axle]} alt={`Грузовая шина ${tire.brand} ${tire.model}`} referrerPolicy="no-referrer" />
      </div>
      <div className="product-body">
        <div className="product-brand" data-testid={`text-brand-${tire.id}`}>{tire.brand}</div>
        <h3 data-testid={`text-model-${tire.id}`}>{tire.model}</h3>
        <div className="product-country" data-testid={`text-country-${tire.id}`}>Страна производства: {tire.country}</div>
        <div className="product-specs">
          <div className="spec-item"><span>Размер</span><strong>{tire.size}</strong></div>
          <div className="spec-item"><span>Ширина</span><strong>{tire.width}</strong></div>
          <div className="spec-item"><span>Профиль</span><strong>{tire.profile}</strong></div>
          <div className="spec-item"><span>Диаметр</span><strong>{tire.diameter}</strong></div>
          <div className="spec-item"><span>Индекс скорости</span><strong>{tire.speed}</strong></div>
          <div className="spec-item"><span>Индекс нагрузки</span><strong>{tire.load}</strong></div>
        </div>
        <div className="product-foot">
          <div>
            <span className="price-label">{isDemo ? 'Цена · демонстрационная' : 'Цена на сайте-источнике'}</span>
            <strong className="product-price" data-testid={`text-price-${tire.id}`}>{formatPrice(tire.price)}</strong>
          </div>
          <div className="product-status" data-testid={`status-availability-${tire.id}`}>
            {isDemo ? tire.availability : `Источник: ${tire.availability}`}
            <b>{isDemo ? 'Демонстрационные данные' : 'Не подтверждено магазином'}</b>
          </div>
        </div>
      </div>
    </article>
  );
}

function Home() {
  const { data: catalog, isLoading, isError, refetch } = useListTires({
    query: { staleTime: 5 * 60 * 1000, retry: 1 },
  });
  const tires = catalog?.products ?? EMPTY_TIRES;
  const [sizeQuery, setSizeQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [axleFilter, setAxleFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [formValues, setFormValues] = useState({ name: '', phone: '', product: '', comment: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'ШинывНН — грузовые шины для коммерческого транспорта';
    document.documentElement.lang = 'ru';
  }, []);

  const filteredTires = useMemo(() => {
    const normalized = normalizeSize(sizeFilter);
    return tires.filter((tire) =>
      (!normalized || normalizeSize(tire.size).includes(normalized)) &&
      (!brandFilter || tire.brand === brandFilter) &&
      (!axleFilter || tire.axle === axleFilter) &&
      (!minPrice || tire.price >= Number(minPrice)) &&
      (!maxPrice || tire.price <= Number(maxPrice))
    );
  }, [tires, sizeFilter, brandFilter, axleFilter, minPrice, maxPrice]);

  const scrollToCatalog = () => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  const runSearch = (event: FormEvent) => {
    event.preventDefault();
    setSizeFilter(sizeQuery.trim());
    scrollToCatalog();
  };
  const resetFilters = () => {
    setSizeQuery('');
    setSizeFilter('');
    setBrandFilter('');
    setAxleFilter('');
    setMinPrice('');
    setMaxPrice('');
  };
  const updateForm = (key: keyof typeof formValues, value: string) => {
    setFormValues((previous) => ({ ...previous, [key]: value }));
    setSubmitted(false);
    if (formErrors[key]) setFormErrors((previous) => ({ ...previous, [key]: '' }));
  };
  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (formValues.name.trim().length < 2) errors.name = 'Укажите имя не короче двух символов.';
    if (formValues.phone.replace(/\D/g, '').length < 10) errors.phone = 'Укажите корректный номер телефона.';
    if (formValues.product.trim().length < 2) errors.product = 'Укажите размер или модель шины.';
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      setSubmitted(false);
      return;
    }
    setSubmitted(true);
    setFormValues({ name: '', phone: '', product: '', comment: '' });
  };

  return (
    <div className="site-shell">
      <div className="topline">
        <div className="container topline-inner">
          <span className="topline-label">Шины для коммерческого транспорта</span>
          <span>Каталог · демонстрационный прототип</span>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <a href="#top" className="brand" aria-label="ШинывНН — на главную" data-testid="link-home">
            <span className="brand-mark">ШН</span>
            <span><span className="brand-name">ШинывНН</span><span className="brand-caption">грузовые шины</span></span>
          </a>
          <nav className="nav" aria-label="Основная навигация">
            <a href="#catalog" data-testid="link-catalog">Каталог</a>
            <a href="#about" data-testid="link-about">О подборе</a>
            <a href="#request" data-testid="link-request">Запросить подбор</a>
          </nav>
          <a className="header-action" href="#request" data-testid="link-header-request">Оставить запрос <ArrowRight size={14} /></a>
          <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} data-testid="button-mobile-menu">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && <nav className="mobile-menu" aria-label="Мобильная навигация">
          <a href="#catalog" onClick={() => setMenuOpen(false)} data-testid="link-mobile-catalog">Каталог</a>
          <a href="#about" onClick={() => setMenuOpen(false)} data-testid="link-mobile-about">О подборе</a>
          <a href="#request" onClick={() => setMenuOpen(false)} data-testid="link-mobile-request">Запросить подбор</a>
        </nav>}
      </header>

      <main>
        <section className="hero" id="top">
          <div className="container">
            <div className="hero-content">
              <div className="eyebrow">Решения для грузового парка</div>
              <h1>Шины, которые держат <span>маршрут.</span></h1>
              <p className="hero-copy">Подбор грузовых шин по размеру и оси. Собрали модели для магистральных тягачей, прицепов и коммерческого транспорта.</p>
              <div className="hero-stats">
                <div className="hero-stat"><strong>22.5″</strong><span>ходовые диаметры</span></div>
                <div className="hero-stat"><strong>3 типа</strong><span>рулевая · ведущая · прицепная</span></div>
                <div className="hero-stat"><strong>6 моделей</strong><span>в демонстрационном каталоге</span></div>
              </div>
            </div>
          </div>
        </section>

        <div className="container search-wrap">
          <form className="size-search" onSubmit={runSearch} role="search">
            <div className="search-symbol"><Search size={19} /></div>
            <div className="search-field">
              <label htmlFor="size-search">Подобрать по размеру</label>
              <input id="size-search" type="search" value={sizeQuery} onChange={(event) => setSizeQuery(event.target.value)} placeholder="Например, 315/70 R22.5" aria-label="Размер грузовой шины" data-testid="input-size-search" />
            </div>
            <button className="search-button" type="submit" data-testid="button-search-size">Найти шины <ArrowRight size={15} /></button>
          </form>
          <p className="search-hint">Можно вводить без пробелов или с любым регистром: 315/70R22.5</p>
        </div>

        <section className="catalog-section" id="catalog">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="section-kicker">Каталог грузовых шин</div>
                <h2>Подберите шину под свою ось</h2>
                <p>
                  {catalog?.source === 'donor'
                    ? 'Цены и наличие показаны по данным сайта-источника и не подтверждены магазином.'
                    : 'Все товары, цены и статусы наличия ниже — демонстрационные данные.'}
                </p>
              </div>
              <div className="result-count" data-testid="text-result-count">
                {isLoading ? 'Загружаем каталог…' : isError ? 'Каталог недоступен' : `Показано: ${filteredTires.length} из ${tires.length} моделей`}
              </div>
            </div>
            <div className="catalog-layout">
              <aside className="filters" aria-label="Фильтры каталога">
                <div className="filter-head">
                  <strong>Фильтры каталога</strong>
                  <button type="button" className="reset-button" onClick={resetFilters} data-testid="button-reset-filters">Сбросить всё</button>
                </div>
                <div className="filter-group">
                  <label htmlFor="filter-size">Размер шины</label>
                  <input id="filter-size" type="search" placeholder="Например, 315/70 R22.5" value={sizeFilter} onChange={(event) => { setSizeFilter(event.target.value); setSizeQuery(event.target.value); }} data-testid="input-filter-size" />
                </div>
                <div className="filter-row">
                  <div className="filter-group">
                    <label htmlFor="filter-brand">Производитель</label>
                    <select id="filter-brand" value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} data-testid="select-filter-brand">
                      <option value="">Все бренды</option>
                      {[...new Set(tires.map((tire) => tire.brand))].map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label htmlFor="filter-axle">Тип оси</label>
                    <select id="filter-axle" value={axleFilter} onChange={(event) => setAxleFilter(event.target.value)} data-testid="select-filter-axle">
                      <option value="">Все оси</option>
                      <option value="рулевая">Рулевая</option>
                      <option value="ведущая">Ведущая</option>
                      <option value="прицепная">Прицепная</option>
                    </select>
                  </div>
                </div>
                <div className="filter-group">
                  <span className="filter-label">Цена, ₽ · демо</span>
                  <div className="price-inputs">
                    <input type="number" min="0" aria-label="Цена от, рублей" placeholder="От" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} data-testid="input-price-min" />
                    <input type="number" min="0" aria-label="Цена до, рублей" placeholder="До" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} data-testid="input-price-max" />
                  </div>
                </div>
              </aside>
              <div className="product-grid" aria-live="polite">
                {isLoading && <div className="empty-state" role="status" data-testid="status-catalog-loading">
                  <h3>Загружаем каталог шин</h3>
                  <p>Получаем список товаров от API.</p>
                </div>}
                {isError && <div className="empty-state" role="alert" data-testid="status-catalog-error">
                  <h3>Не удалось загрузить каталог</h3>
                  <p>Попробуйте запросить данные ещё раз.</p>
                  <button type="button" className="reset-button" onClick={() => void refetch()} data-testid="button-retry-catalog">Повторить загрузку</button>
                </div>}
                {!isLoading && !isError && filteredTires.map((tire) => <ProductCard key={tire.id} tire={tire} source={catalog.source} />)}
                {!isLoading && !isError && filteredTires.length === 0 && <div className="empty-state" data-testid="status-empty-results">
                  <div className="empty-mark"><Search size={19} /></div>
                  <h3>По этим условиям шин не найдено</h3>
                  <p>Измените размер или фильтры — в каталоге есть другие демонстрационные модели.</p>
                  <button type="button" className="reset-button" onClick={resetFilters} data-testid="button-reset-empty">Сбросить фильтры</button>
                </div>}
              </div>
            </div>
          </div>
        </section>

        <section className="about-strip" id="about">
          <div className="container about-grid">
            <div>
              <div className="section-kicker">Сначала задача, потом модель</div>
              <h2>У каждой оси — своя работа.</h2>
              <p>Рулевая, ведущая и прицепная шины отличаются рисунком протектора и назначением. Ориентируйтесь на размер и требования вашего автомобиля, а характеристики модели уточняйте перед покупкой.</p>
            </div>
            <div className="about-points">
              <div className="about-point"><strong>Рулевая ось</strong><span>Контроль направления и устойчивость в движении.</span></div>
              <div className="about-point"><strong>Ведущая ось</strong><span>Передача тяги на дорожное покрытие.</span></div>
              <div className="about-point"><strong>Прицепная ось</strong><span>Для колёс прицепов и полуприцепов.</span></div>
              <div className="about-point"><strong>Подбор по размеру</strong><span>Сверьте маркировку с рекомендациями производителя техники.</span></div>
            </div>
          </div>
        </section>

        <section className="request-section" id="request">
          <div className="container request-grid">
            <div className="request-copy">
              <div className="section-kicker">Запрос на подбор</div>
              <h2>Нужен другой размер или несколько комплектов?</h2>
              <p>Заполните форму, чтобы проверить пользовательский сценарий запроса. Введите удобный контакт и укажите размер или модель.</p>
              <div className="demo-notice" data-testid="status-demo-disclaimer">Демонстрационная форма: отправка никуда не передаёт данные. Запрос не отправляется и не поступает реальному магазину.</div>
            </div>
            <form className="request-form" onSubmit={submitRequest} noValidate>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="request-name">Ваше имя <span aria-hidden="true">*</span></label>
                  <input id="request-name" className="form-control" value={formValues.name} onChange={(event) => updateForm('name', event.target.value)} aria-invalid={!!formErrors.name} aria-describedby={formErrors.name ? 'error-name' : undefined} autoComplete="name" data-testid="input-request-name" />
                  {formErrors.name && <div className="field-error" id="error-name" data-testid="error-request-name">{formErrors.name}</div>}
                </div>
                <div className="form-field">
                  <label htmlFor="request-phone">Телефон для связи <span aria-hidden="true">*</span></label>
                  <input id="request-phone" className="form-control" type="tel" placeholder="+7 (___) ___-__-__" value={formValues.phone} onChange={(event) => updateForm('phone', event.target.value)} aria-invalid={!!formErrors.phone} aria-describedby={formErrors.phone ? 'error-phone' : undefined} autoComplete="tel" data-testid="input-request-phone" />
                  {formErrors.phone && <div className="field-error" id="error-phone" data-testid="error-request-phone">{formErrors.phone}</div>}
                </div>
                <div className="form-field full">
                  <label htmlFor="request-product">Размер или модель шины <span aria-hidden="true">*</span></label>
                  <input id="request-product" className="form-control" placeholder="Например, 315/70 R22.5 или Hankook AH35" value={formValues.product} onChange={(event) => updateForm('product', event.target.value)} aria-invalid={!!formErrors.product} aria-describedby={formErrors.product ? 'error-product' : undefined} data-testid="input-request-product" />
                  {formErrors.product && <div className="field-error" id="error-product" data-testid="error-request-product">{formErrors.product}</div>}
                </div>
                <div className="form-field full">
                  <label htmlFor="request-comment">Комментарий <span>(необязательно)</span></label>
                  <textarea id="request-comment" className="form-control" placeholder="Количество, тип оси или другие детали" value={formValues.comment} onChange={(event) => updateForm('comment', event.target.value)} data-testid="input-request-comment" />
                </div>
              </div>
              <div className="form-bottom">
                <button className="primary-button" type="submit" data-testid="button-submit-request">Проверить форму <ArrowRight size={15} /></button>
                <span className="form-footnote">Нажатие покажет только демонстрационный результат.</span>
              </div>
              {submitted && <div className="form-success" role="status" data-testid="status-request-success"><Check size={16} /> Проверка пройдена. Это демонстрация: запрос не отправлен и не получен магазином.</div>}
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand"><span className="brand-mark">ШН</span><strong>ШинывНН</strong><span className="footer-copy">· грузовые шины</span></div>
          <div className="footer-disclaimer">Демонстрационный каталог. Цены и наличие не являются актуальным предложением.</div>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
