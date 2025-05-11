export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  imageUrl: string | null;
  size: Size;
  variant: string[];
  createdAt: string;
  updatedAt: string;
  category: {
    key: string;
    name: string;
  };
  type: {
    key: string;
    name: string;
  };
  objective: {
    key: string;
    name: string;
  };
  color: {
    key: string;
    name: string;
  };
};

export enum Size {
  SMALL = "S",
  MEDIUM = "M",
  LARGE = "L",
  XL = "XL",
  XXL = "XXL",
}
