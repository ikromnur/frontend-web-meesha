import { StaticImageData } from "next/image";
import { Availability } from "@/types/product";

export enum Size {
  SMALL = "Small",
  MEDIUM = "Medium",
  LARGE = "Large",
  EXTRA_LARGE = "Extra Large",
}

export type Cart = {
  id: string; // gunakan UUID string
  product_id?: string;
  name: string;
  image: string | StaticImageData;
  price: number;
  quantity: number;
  size: Size;
  availability?: Availability;
};
