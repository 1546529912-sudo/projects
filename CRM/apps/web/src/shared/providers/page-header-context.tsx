import { createContext, useContext, useEffect, useState } from 'react';

interface PageHeader {
  title: string;
  subtitle?: string;
}

interface PageHeaderContextValue {
  header: PageHeader;
  setHeader: (h: PageHeader) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  header: { title: '' },
  setHeader: () => {},
});

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [header, setHeader] = useState<PageHeader>({ title: '' });
  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeaderValue() {
  return useContext(PageHeaderContext).header;
}

export function usePageHeader(title: string, subtitle?: string) {
  const { setHeader } = useContext(PageHeaderContext);

  useEffect(() => {
    setHeader({ title, subtitle });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle]);
}
