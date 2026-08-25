@echo off
:: Define a pasta a ser listada como a pasta onde o script está localizado
set "PASTA=%~dp0"

:: Define o nome do arquivo de saída
set "ARQUIVO_SAIDA=%PASTA%lista_arquivos.txt"

:: Lista os arquivos e diretórios em forma de árvore e salva no arquivo de saída
tree "%PASTA%" /f /a > "%ARQUIVO_SAIDA%"

:: Mensagem de conclusão
echo Listagem concluída. O arquivo foi salvo em %ARQUIVO_SAIDA%