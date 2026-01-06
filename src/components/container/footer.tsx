"use client";

import { useRouter } from "next/navigation";
import logo from "../../../public/logomeeshatext.svg";
import Image from "next/image";
import { socialMedia } from "@/data/static-data";
import { Button } from "../ui/button";
import { RiWechatLine } from "react-icons/ri";
import { MdOutlineWorkOutline } from "react-icons/md";
import { FiPhone } from "react-icons/fi";
import { IoLocationOutline } from "react-icons/io5";
import Link from "next/link";

const footerData = [
  {
    icon: <RiWechatLine size={20} />,
    title: "Hubungi kami melalui email",
    paragraf: "Tim kami yang ramah siap membantu.",
    additional: "meesha.co123@gmail.com",
  },
  {
    icon: <MdOutlineWorkOutline size={20} />,
    title: "Untuk Karir",
    paragraf: "Kirim resume Anda",
    additional: "meesha.co123@gmail.com",
  },
  {
    icon: <FiPhone size={20} />,
    title: "Hubungi kami melalui WhatsApp",
    paragraf: "Mon-Fri from 8am to 5pm.",
    additional: "(+62) 877 3910 2801",
  },
  {
    icon: <IoLocationOutline size={20} />,
    title: "Store",
    paragraf: "Mari datang dan sapa kami di Store",
    additional:
      "Jl. Sokka Petanahan No.554, Widarapayung, Kedawung, Kec. Pejagoan, Kabupaten Kebumen, Jawa Tengah 54361",
  },
];

const DefaultFooter = () => {
  const router = useRouter();

  return (
    <footer className="bg-[#F5E1DA]">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-8">
        <Link href={"/"}>
          <Image src={logo} alt="logo" />
        </Link>
        <p className="font-semibold text-xs ml-12 text-[#444444]">
          Kami senang mendengar kabar dari Anda. Tim kami yang ramah selalu siap
          untuk mengobrol.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 mt-6">
          {footerData.map((item, index) => (
            <div className="space-y-4" key={index}>
              <div className="flex items-center gap-1.5">
                <span className="shrink-0">{item.icon}</span>
                <h4 className="font-bold text-[#444444]">{item.title}</h4>
              </div>
              <div className="space-y-2 ml-6">
                <p className="text-sm text-[#5A5A5A]">{item.paragraf}</p>
                <a
                  className={`block text-sm break-all text-[#5A5A5A] max-w-full ${
                    index === 0 || index === 1
                      ? "cursor-pointer"
                      : "cursor-text"
                  }`}
                  href={
                    (index === 0 || index === 1) && item.additional
                      ? `mailto:${item.additional}`
                      : undefined
                  }
                >
                  {item.additional}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#D9BEB5] p-4 text-center">
        <div className="flex flex-col md:flex-row md:justify-between mx-auto w-full max-w-screen-xl md:items-center gap-2">
          <small className="text-sm text-[#333]">
            ©Copyright 2025 All rights reserved
          </small>
          <div className="flex items-center gap-2 flex-col md:flex-row">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push("/terms")}
                className="text-[#333] font-normal text-sm"
                variant={"link"}
                size={"sm"}
              >
                Terms of Service
              </Button>
              <Button
                onClick={() => router.push("/privacy")}
                className="text-[#333] font-normal text-sm"
                variant={"link"}
                size={"sm"}
              >
                Privacy Policy
              </Button>
            </div>
            {/* Social Media */}
            <div className="flex items-center gap-2">
              {socialMedia.map((item) => (
                <a
                  target="_blank"
                  className="hover:scale-105 duration-300 transition-transform"
                  href={item.link}
                  rel="noopener noreferrer"
                  key={item.id}
                >
                  <Image
                    width={40}
                    height={40}
                    src={item.iconSource}
                    alt={item.name}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DefaultFooter;
