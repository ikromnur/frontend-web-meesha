"use client";

import { Button } from "@/components/ui/button";
import Image, { StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import vector from "../../../../public/vector-1.svg";
import banner from "../../../../public/banner-1.png";
import banner2 from "../../../../public/banner-2.png";
import { popular, collection, socialMedia } from "@/data/static-data";
import { cn } from "@/lib/utils";
import { PopularProductsCarousel } from "@/features/products/components/popular-products-carousel";

const CardCollection = ({
  name,
  image,
}: {
  name: string;
  image: string | StaticImageData;
}) => {
  return (
    <div className="flex flex-col gap-5">
      <Image
        src={image}
        className="w-full h-auto object-cover drop-shadow-sm"
        width={300}
        height={480}
        alt={name}
        loading="lazy"
      />
      <p className="font-semibold text-center">{name}</p>
    </div>
  );
};

const CardPopularCategory = ({
  name,
  image,
}: {
  name: string;
  image: string | StaticImageData;
}) => {
  return (
    <div className="flex flex-col items-center gap-4 bg-[#F1F1F1] rounded-3xl py-9 hover:bg-primary transition-colors duration-300 group  shadow-sm">
      <h3 className="font-semibold text-center text-lg lg:text-xl max-w-[60%]">
        {name}
      </h3>
      <div className="flex items-center justify-center h-full">
        <Image
          className="w-20 lg:w-32 h-auto object-cover group-hover:scale-125 transition-transform duration-300"
          width={300}
          height={200}
          alt="vector"
          loading="lazy"
          src={image}
        />
      </div>
    </div>
  );
};

const CardSocialMedia = ({
  name,
  image,
  icon,
  textColor,
  href,
}: {
  name: string;
  image: string | StaticImageData;
  icon: string | StaticImageData;
  textColor: string;
  href: string;
}) => {
  return (
    <a
      href={href}
      className="flex flex-col gap-4"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex items-center gap-1 justify-center">
        <Image src={icon} width={50} height={50} alt={name} />
        <span className="font-bold text-xl" style={{ color: textColor }}>
          {name}
        </span>
      </div>
      <Image
        className="w-full h-auto object-cover drop-shadow-sm"
        src={image}
        width={300}
        height={300}
        alt={name}
      />
    </a>
  );
};

export const GalleryCollection = ({ className }: { className?: string }) => {
  return (
    <section className={cn("py-7", className)}>
      <div className="text-center">
        <span>Share your setup with</span>
        <h2 className="font-bold text-3xl">#Meesha.co</h2>
      </div>
      <Image
        className="w-screen h-auto"
        src={banner2}
        width={800}
        height={800}
        alt="banner"
      />
    </section>
  );
};

export const SocialMediaSection = ({ className }: { className?: string }) => {
  return (
    <section
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-6 py-7 mx-auto max-w-screen-xl px-4",
        className
      )}
    >
      {socialMedia.slice(0, 2).map((item) => (
        <CardSocialMedia
          key={item.id}
          name={item.name}
          image={item.image}
          icon={item.iconSource}
          textColor={item.color}
          href={item.link}
        />
      ))}
    </section>
  );
};

const Homepage = () => {
  const router = useRouter();
  return (
    <>
      {/* Jumbotron */}
      <section className="relative">
        <div className="relative w-full h-[calc(100svh-84.84px)] bg-black/10 bg-blend-multiply">
          <Image
            className="w-full h-full object-cover mix-blend-multiply"
            priority
            width={800}
            height={800}
            alt="jumbotron"
            src="/jumbotron.png"
          />
        </div>

        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-4 md:px-8 lg:px-16">
          <h1 className="font-semibold text-white text-[clamp(2rem,5vw,3rem)] drop-shadow-2xl">
            Florist Flower & Bouquet
          </h1>
          <Button
            className="mt-4 bg-[#FF85BC] hover:bg-[#FF85BC]/90"
            size={"lg"}
            onClick={() => router.push("/products")}
          >
            Explore All Products
          </Button>
        </div>
      </section>

      <div className="w-full mx-auto py-10 space-y-5">
        {/* Popular Categories */}
        <section className="py-7 space-y-16 px-4 max-w-screen-xl mx-auto">
          <div className="flex items-center w-full justify-between relative">
            <Image
              src={vector}
              width={200}
              height={100}
              alt="vector"
              className="absolute -bottom-4 left-0"
            />
            <h2 className="text-2xl font-semibold">Shop Popular Categories</h2>
            <Button
              onClick={() => router.push("/products")}
              variant={"link"}
              size={"lg"}
            >
              See All
            </Button>
          </div>
          {/* Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4  gap-4 mt-8">
            {popular.map((item) => (
              <CardPopularCategory
                key={item.id}
                name={item.name}
                image={item.image}
              />
            ))}
          </div>
          {/* Popular Products preview carousel */}
          <PopularProductsCarousel
            title="Produk Populer"
            limit={10}
            seeAllHref="/products"
            className="mt-6"
          />
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center md:flex-row gap-8 py-14 px-4 max-w-screen-xl mx-auto">
          <Image
            src={banner}
            width={800}
            height={800}
            alt="banner"
            className="w-full h-auto lg:max-w-[55%] object-cover order-2 md:order-1"
          />
          <div className="order-1 md:order-2 ">
            <h2 className="text-2xl font-semibold mb-2">
              Simple Bouquet for Your Couple
            </h2>
            <p className="text-[#9F9F9F] mb-2 lg:mb-10">
              Enjoy with your couple using our latest Simple bouqet set!
            </p>
            <Button
              onClick={() => router.push("/products")}
              className="bg-[#FF85BC] hover:bg-[#FF85BC]/90"
              size={"lg"}
            >
              Explore All Products
            </Button>
          </div>
        </section>

        {/* Collection */}
        <section className="py-7 px-4 max-w-screen-xl mx-auto">
          <div className="relative w-full mx-auto">
            <Image
              src={vector}
              width={200}
              height={100}
              alt="vector"
              className="absolute -bottom-5 left-1/2 -translate-x-1/2"
            />
            <h2 className="text-2xl font-semibold text-center">Collections</h2>
          </div>
          <div className="grid grid-cols-3  gap-4 mt-12 md:gap-6 lg:gap-8">
            {collection.map((item) => (
              <CardCollection
                key={item.id}
                name={item.name}
                image={item.image}
              />
            ))}
          </div>
        </section>

        {/* Gallery */}
        <GalleryCollection />

        {/* Social Media */}
        <SocialMediaSection />
      </div>
    </>
  );
};

export default Homepage;
