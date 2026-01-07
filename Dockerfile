# Gunakan base image Node.js yang ringan
FROM node:20-alpine

# Set direktori kerja di dalam container
WORKDIR /app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Gunakan npm install (lebih aman daripada ci jika lockfile berubah)
RUN npm install

# Salin seluruh kode source
COPY . .

# Argument build time untuk Next.js Public Env
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# Build aplikasi Next.js
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Jalankan aplikasi
CMD ["npm", "run", "start"]
