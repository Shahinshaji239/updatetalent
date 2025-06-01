from rest_framework import serializers
from .models import Candidate, Skill

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name']

class CandidateSerializer(serializers.ModelSerializer):
    skills = SkillSerializer(many=True)

    class Meta:
        model = Candidate
        fields = [
            'id', 'name', 'email', 'role', 'location', 'experience',
            'skills', 'industry', 'gender', 'current_ctc', 'expected_ctc',
            'resume', 'notes', 'created_at'
        ]
