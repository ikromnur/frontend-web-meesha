import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Dummy image path (di real case ini biasanya pakai URL image atau dynamic import)
const productImage = "/product-image.png";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Kamu bisa ganti ini nanti dengan fetch dari DB
  const product = {
    id: 1,
    name: "Bouquet Mawar Merah",
    description:
      "Tampil cantik dan memikat, buket ini memadukan nuansa ungu, pink, dan putih yang harmonis. Dirangkai dengan elegan",
    size: "LARGE",
    variant: [
      "Chrysanthemum (various colors)",
      "Gerbera (various colors)",
      "Pink Carnation",
      "Baby's Breath (Gypsophila)",
    ],
    price: 150000,
    image: productImage,
  };

  // Check apakah id-nya cocok
  if (Number(id) !== product.id) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

// Proxy PUT /api/products/[id] -> backend /api/products/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:4000";
    const { id } = params;

    const formData = await request.formData();

    const response = await fetch(`${BACKEND_URL}/api/v1/products/${id}`, {
      method: "PUT",
      // Forward auth header when available
      headers: {
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization")! }
          : {}),
      },
      body: formData,
      cache: "no-store",
    });

    const data = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.message ||
            `Failed to update product (status ${response.status})`,
          error: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to proxy update product",
        error: String(error),
      },
      { status: 500 }
    );
  }
}

// Proxy DELETE /api/products/[id] -> backend /api/products/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:4000";
    const { id } = params;

    const response = await fetch(`${BACKEND_URL}/api/v1/products/${id}`, {
      method: "DELETE",
      headers: {
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization")! }
          : {}),
      },
      cache: "no-store",
    });

    const data = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.message ||
            `Failed to delete product (status ${response.status})`,
          error: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to proxy delete product",
        error: String(error),
      },
      { status: 500 }
    );
  }
}
