all: paper

paper: main.tex
	#pdflatex --interaction nonstopmode main && bibtex main && bibtex main && pdflatex --interaction nonstopmode main
	pdflatex  main && bibtex main && bibtex main && pdflatex  main


clean: 
	rm -f *.dvi *.aux *.log *.blg *.toc *.bbl *~ *.lof *.lot *.out main.pdf
