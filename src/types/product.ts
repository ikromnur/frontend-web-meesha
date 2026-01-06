export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sold?: number; // Total sold count
  description: string;
  imageUrl: {
    url: string;
    publicId: string;
  };
  // Optional: multiple images support (max 5 recommended)
  images?: {
    url: string;
    publicId: string;
  }[];
  // Optional: rating summary provided by backend
  averageRating?: number;
  ratingCount?: number;
  size: Size;
  variant: string[];
  availability: Availability;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    key: string;
    name: string;
  };
  // type: {
  //   id: string;
  //   key: string;
  //   name: string;
  // };
  objective: {
    id: string;
    key: string;
    name: string;
  };
  color: {
    id: string;
    key: string;
    name: string;
  };
};

export enum Size {
  SMALL = "S",
  MEDIUM = "M",
  LARGE = "L",
  XL = "XL",
}

export enum Availability {
  READY = "READY",
  PO_2_DAY = "PO_2_DAY",
  PO_5_DAY = "PO_5_DAY",
}

export type ProductListResponse = {
  data: Product[];
  page: number;
  totalPages: number;
  total: number;
  totalItems: number;
};

