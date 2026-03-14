
import chardet

with open('app/static/js/modules/ui/user-management.js', 'rb') as f:
    rawdata = f.read()
    result = chardet.detect(rawdata)
    print(result)
