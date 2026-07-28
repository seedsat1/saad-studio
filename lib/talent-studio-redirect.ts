type SearchParams = Record<string, string | string[] | undefined>;

export type TalentStudioAliasProps = {
  searchParams?: SearchParams;
};

export function withTalentStudioQuery(pathname: string, searchParams?: SearchParams) {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }
    if (typeof value === "string") params.set(key, value);
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
