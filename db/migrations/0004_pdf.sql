-- PDF guardado em disco. pdf_chave = "versão:dano" da ficha quando o PDF foi gerado;
-- se não bater com a ficha atual, o PDF está velho e é gerado de novo.
alter table character
  add column pdf_path  text,
  add column pdf_chave text;
