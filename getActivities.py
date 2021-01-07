import requests
import csv
from bs4 import BeautifulSoup

### Scape website for Would You Rather questions and add them to the wouldYouRather.csv
url = 'https://conversationstartersworld.com/would-you-rather-questions/'
page = requests.get(url)
soup = BeautifulSoup(page.content, 'html.parser')

rawQuestions = soup.find_all("h3")

with open('wouldYouRather.csv', 'w', newline='') as csvfile:
    fieldnames = ['choice_1', 'choice_2']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    
    writer.writeheader()
    for i in range(len(rawQuestions)):
        innerText = rawQuestions[i].get_text()
        if ('Would you rather ' in innerText) and (', or ' not in innerText):
            choices = innerText.split('Would you rather ', 1)[1].split(' or ')
            writer.writerow({ 'choice_1': str(choices[0]), 'choice_2': str(choices[1]) })