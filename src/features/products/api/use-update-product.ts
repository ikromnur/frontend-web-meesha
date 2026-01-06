import { axiosInstance } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";
import { ProductSchema } from "../form/product";

interface UseUpdateProductProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const UseUpdateProduct = ({
  onError,
  onSuccess,
}: UseUpdateProductProps = {}) => {
  return useMutation({
    mutationFn: async ({
      id,
      product,
    }: {
      id: string;
      product: ProductSchema;
    }) => {
      const formData = new FormData();

      formData.append("name", product.name);
      formData.append("price", String(product.price));
      formData.append("stock", String(product.stock));
      formData.append("description", product.description);

      // Backward compat: single image
      if (product.imageUrl instanceof File) {
        formData.append("imageUrl", product.imageUrl);
      }
      // New: multiple images (max 5). Append each File under 'images'.
      if (Array.isArray(product.images)) {
        product.images.forEach((img) => {
          if (img instanceof File) {
            formData.append("images", img);
          }
        });
      }

      formData.append("size", product.size);
      formData.append("availability", product.availability);

      formData.append("variant", JSON.stringify(product.variant));

      formData.append("category", JSON.stringify(product.category));
      // type removed
      formData.append("objective", JSON.stringify(product.objective));
      formData.append("color", JSON.stringify(product.color));

      if (product.removeImagePublicIds && product.removeImagePublicIds.length > 0) {
        formData.append(
          "removeImagePublicIds",
          JSON.stringify(product.removeImagePublicIds)
        );
      }

      const { data } = await axiosInstance.put(`/products/${id}`, formData);

      console.log(data);

      return data.data;
    },
    onError,
    onSuccess,
  });
};
