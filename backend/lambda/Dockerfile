FROM public.ecr.aws/lambda/python:3.11

WORKDIR /var/task

COPY requirements.txt .
RUN python -m pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

COPY app/ app/

CMD ["app.main.handler"]
