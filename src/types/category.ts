export type Category = {
  id: string;
  key: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCategoryInput = {
  key: string;
  name: string;
  description?: string;
};

export type UpdateCategoryInput = {
  id: string;
  key?: string;
  name?: string;
  description?: string;
};
