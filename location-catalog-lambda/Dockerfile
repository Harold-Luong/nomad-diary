FROM public.ecr.aws/lambda/nodejs:22

COPY package.json package-lock.json ${LAMBDA_TASK_ROOT}/
RUN npm ci --omit=dev

COPY src ${LAMBDA_TASK_ROOT}/src

CMD ["src/handlers/query.handler"]
